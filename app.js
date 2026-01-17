#!/usr/bin/env node

import { promises as fs } from 'fs';
import colors from 'colors';
import PromptSync from 'prompt-sync';
import nodeBashTitle from 'node-bash-title';
import yargs from 'yargs';

const prompt = PromptSync();

const usage = '\nUsage: view <username/ID>';
const argv = yargs(process.argv.slice(2))
    .usage(usage)
    .help(true)
    .argv;

const log = (txt) => console.log('[X] '.brightRed + txt);
const error = (txt) => console.log('[!] '.brightRed + txt.toUpperCase());
const pprompt = (txt) => prompt('[X] '.brightRed + '>> ' + txt.toUpperCase().brightWhite);

const showErr = () => {
    error('An error occurred');
    pprompt('Press any key to quit');
    process.exit(1);
};

class UserDataCollector {
    constructor(userId) {
        this.userId = userId;
        this.info = Array(10).fill('');
    }

    async fetchJson(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            console.error(`Error fetching ${url}:`, err.message);
            return null;
        }
    }

    async fetchAndDisplay(url, fields, labels, index, options = {}) {
        const data = await this.fetchJson(url);
        if (!data) return;

        const fieldArray = fields.split(',');
        const labelArray = labels.split(',');
        
        let dataArray;
        if (options.dataPath === 'data') {
            dataArray = data.data || [];
        } else if (options.dataPath === 'root') {
            dataArray = Array.isArray(data) ? data : [data];
        } else if (options.dataPath === 'count') {
            console.log(labels.brightRed + data.count);
            this.info[index] += '\n\n' + labels + data.count + '\n';
            return;
        } else if (options.dataPath === 'groups') {
            this.info[index] += '\n\n';
            const groups = data.data || [];
            groups.forEach(group => {
                console.log(group);
                this.info[index] += JSON.stringify(group) + '\n';
            });
            return;
        } else {
            dataArray = [data];
        }

        for (let i = 0; i < dataArray.length; i++) {
            this.info[index] += '\n\n';
            for (let n = 0; n < fieldArray.length; n++) {
                const field = fieldArray[n];
                const label = labelArray[n];
                const value = dataArray[i][field];
                
                const prefix = options.numbered ? `[${i + 1}] ` : '';
                console.log(prefix + label.brightRed + ': ' + value);
                this.info[index] += prefix + label + ': ' + value + '\n';
            }
            if (options.numbered) console.log();
        }
    }

    async getUserBasicInfo() {
        await this.fetchAndDisplay(
            `https://users.roblox.com/v1/users/${this.userId}`,
            'displayName,description,created',
            'Display Name,About Me,Join Date',
            1
        );
    }

    async getFavoriteGames() {
        await this.fetchAndDisplay(
            `https://games.roblox.com/v2/users/${this.userId}/favorite/games?sortOrder=Asc&limit=10`,
            'id,name',
            'Game ID,Game Name',
            2,
            { dataPath: 'data', numbered: true }
        );
    }

    async getGameBadges() {
        await this.fetchAndDisplay(
            `https://badges.roblox.com/v1/users/${this.userId}/badges?limit=10&sortOrder=Asc`,
            'id,name,description',
            'Badge ID,Badge Name,Badge Description',
            3,
            { dataPath: 'data', numbered: true }
        );
    }

    async getRobloxBadges() {
        await this.fetchAndDisplay(
            `https://accountinformation.roblox.com/v1/users/${this.userId}/roblox-badges`,
            'name,description',
            'Badge Name,Badge Description',
            4,
            { dataPath: 'root' }
        );
    }

    async getGroups() {
        await this.fetchAndDisplay(
            `https://groups.roblox.com/v2/users/${this.userId}/groups/roles`,
            '',
            '',
            5,
            { dataPath: 'groups' }
        );
    }

    async getFriends(limit = 10) {
        await this.fetchAndDisplay(
            `https://friends.roblox.com/v1/users/${this.userId}/friends?limit=${limit}`,
            'id,isOnline,name,displayName',
            'User ID,Is Online,Name,Display Name',
            6,
            { dataPath: 'data', numbered: true }
        );
    }

    async getFriendsCount() {
        await this.fetchAndDisplay(
            `https://friends.roblox.com/v1/users/${this.userId}/friends/count`,
            '',
            'Friends: ',
            7,
            { dataPath: 'count' }
        );
    }

    async getFollowersCount() {
        await this.fetchAndDisplay(
            `https://friends.roblox.com/v1/users/${this.userId}/followers/count`,
            '',
            'Followers: ',
            7,
            { dataPath: 'count' }
        );
    }

    async getFollowingsCount() {
        await this.fetchAndDisplay(
            `https://friends.roblox.com/v1/users/${this.userId}/followings/count`,
            '',
            'Following: ',
            7,
            { dataPath: 'count' }
        );
    }

    async getAvatar() {
        await this.fetchAndDisplay(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${this.userId}&size=150x150&format=Png&isCircular=false`,
            'imageUrl',
            'Headshot',
            8,
            { dataPath: 'data', numbered: true }
        );
    }

    async saveAllToFiles() {
        const data = await this.fetchJson(`https://users.roblox.com/v1/users/${this.userId}`);
        if (!data || !data.name) {
            error('Could not retrieve username');
            return;
        }

        const folderName = data.name;
        await fs.mkdir(folderName, { recursive: true });

        await this.getUserBasicInfo();
        await this.getFavoriteGames();
        await this.getGameBadges();
        await this.getRobloxBadges();
        await this.getGroups();
        await this.getFriends();
        await this.getAvatar();
        await this.getFriendsCount();
        await this.getFollowersCount();
        await this.getFollowingsCount();

        console.clear();

        const files = [
            { name: 'Basic_User_Info.txt', index: 1 },
            { name: 'Favorite_Games.txt', index: 2 },
            { name: 'Game_Badges.txt', index: 3 },
            { name: 'Roblox_Badges.txt', index: 4 },
            { name: 'Groups.txt', index: 5 },
            { name: 'Friends.txt', index: 6 },
            { name: 'Friends_Following_Followers_Count.txt', index: 7 }
        ];

        await Promise.all(
            files.map(({ name, index }) =>
                fs.writeFile(`${folderName}/${name}`, this.info[index] || '').catch(err => console.error(err))
            )
        );

        console.clear();
        console.log('DONE!');
    }

    async displayAllInfo() {
        console.log('\n\nUSER INFO:'.brightWhite);
        await this.getUserBasicInfo();
        
        console.log('\nFAVORITE GAMES:'.brightWhite);
        await this.getFavoriteGames();
        
        console.log('\nBADGES:'.brightWhite);
        await this.getGameBadges();
        
        console.log('\nROBLOX BADGES');
        await this.getRobloxBadges();
        
        console.log('\nGROUP ROLES');
        await this.getGroups();
        
        console.log('\nFRIENDS');
        await this.getFriends(200);
        
        console.log('\nFRIENDS/FOLLOWERS/FOLLOWINGS COUNT');
        await this.getFriendsCount();
        await this.getFollowersCount();
        await this.getFollowingsCount();
        
        console.log('\nROBLOX AVATAR');
        await this.getAvatar();
    }
}

const displayBanner = () => {
    nodeBashTitle('BANVIEW BY SCR1PP3D');
    console.clear();
    console.log(`      
    
██████╗░░█████╗░███╗░░██╗██╗░░░██╗██╗███████╗░██╗░░░░░░░██╗
██╔══██╗██╔══██╗████╗░██║██║░░░██║██║██╔════╝░██║░░██╗░░██║
██████╦╝███████║██╔██╗██║╚██╗░██╔╝██║█████╗░░░╚██╗████╗██╔╝
██╔══██╗██╔══██║██║╚████║░╚████╔╝░██║██╔══╝░░░░████╔═████║░
██████╦╝██║░░██║██║░╚███║░░╚██╔╝░░██║███████╗░░╚██╔╝░╚██╔╝░
╚═════╝░╚═╝░░╚═╝╚═╝░░╚══╝░░░╚═╝░░░╚═╝╚══════╝░░░╚═╝░░░╚═╝░░BANNED USER VIEWER 
    BY SCR1PP3D
    ─────────────────────────────────────────────────`.brightRed);
};

const getUserIdFromUsername = async (username) => {
    const urls = [
        `https://users.roblox.com/v1/users/by-username?username=${encodeURIComponent(username)}`,
    ];
    
    for (const url of urls) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.id) {
                    return data.id;
                }
            }
        } catch (err) {
            continue;
        }
    }
    
    error('User not found - try using a direct user ID instead');
    pprompt('Press any key to quit');
    process.exit(1);
};

const promptForIdType = (arg) => {
    log('You entered a number, is this a URL (u) or an ID (i): ');
    const type = pprompt('');
    
    if (type.toLowerCase() === 'u') {
        return getUserIdFromUsername(arg);
    } else if (type.toLowerCase() === 'i') {
        return arg;
    } else {
        return promptForIdType(arg);
    }
};

const getUserId = async () => {
    displayBanner();
    const arg = argv._.toString();
    
    if (!arg) {
        process.exit(1);
    }
    
    if (parseInt(arg)) {
        return await promptForIdType(arg);
    } else if (typeof arg === 'string' && !arg.includes('=')) {
        return await getUserIdFromUsername(arg);
    } else {
        process.exit(1);
    }
};

const showMenu = async (collector) => {
    displayBanner();
    log('ID: ' + collector.userId);

    console.log(`
    [1] Basic User Info (Display Name, Join Date)
    [2] Favorite Games
    [3] Game Badges
    [4] Roblox Badges
    [5] Groups they were in
    [6] Friends
    [7] Friends, Followings and Followers Count
    [8] Roblox avatar (face only)
    [9] Save all to .txt file
    [10] Display everything about the user
    [11] Exit
    `);

    const opt = pprompt('');

    switch (opt) {
        case '1':
            console.clear();
            await collector.getUserBasicInfo();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '2':
            console.clear();
            await collector.getFavoriteGames();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '3':
            console.clear();
            await collector.getGameBadges();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '4':
            console.clear();
            await collector.getRobloxBadges();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '5':
            console.clear();
            await collector.getGroups();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '6':
            console.clear();
            await collector.getFriends();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '7':
            console.clear();
            await collector.getFriendsCount();
            await collector.getFollowersCount();
            await collector.getFollowingsCount();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '8':
            console.clear();
            await collector.getAvatar();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '9':
            console.clear();
            await collector.saveAllToFiles();
            await showMenu(collector);
            break;
        case '10':
            await collector.displayAllInfo();
            pprompt('Press any key to continue');
            await showMenu(collector);
            break;
        case '11':
            process.exit(0);
            break;
        default:
            await showMenu(collector);
    }
};

const main = async () => {
    const userId = await getUserId();
    if (!userId) {
        showErr();
    }
    const collector = new UserDataCollector(userId);
    await showMenu(collector);
};

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});