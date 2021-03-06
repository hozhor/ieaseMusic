
import { observable, action } from 'mobx';
import axios from 'axios';

import storage from 'utils/storage';
import player from './player';
import home from './home';

class Me {
    @observable initialized = false;
    @observable logining = false;
    @observable profile = {};

    // Store the liked song
    @observable likes = new Map();

    @action async init() {
        var response = await axios.get('/login/refresh');
        var profile = await storage.get('profile');

        if (response.data.code !== 200
            || !profile) {
            self.profile = {};
            self.initialized = true;
            return false;
        }

        // App has been initialized
        self.profile = profile;
        self.initialized = true;

        return true;
    }

    @action async login(phone, password) {
        self.logining = true;

        var response = await axios.get('/login/cellphone', {
            params: {
                phone,
                password,
            }
        });

        if (response.data.code !== 200) {
            console.error(`Failed to login: ${response.data.msg}`);
            self.logining = false;
            return false;
        }

        self.profile = response.data.profile;
        await home.load();
        await storage.set('profile', self.profile);
        self.logining = false;

        return self.profile;
    }

    @action async logout() {
        await storage.remove('profile');
    }

    @action rocking(likes) {
        var mapping = new Map();

        // Keep the liked playlist id
        mapping.set('id', likes.id.toString());

        likes.songs.map(e => {
            mapping.set(e, true);
        });

        self.likes.replace(mapping);
    }

    // Check is a red heart song
    isLiked(id) {
        return self.hasLogin() && self.likes.get(id);
    }

    // Like a song
    @action async like(song) {
        if (await self.exeLike(song, true)) {
            self.likes.set(song.id, true);
        }
    }

    // Unlike a song
    @action async unlike(song) {
        self.likes.set(song.id, !(await self.exeLike(song, false)));
    }

    async exeLike(song, truefalse) {
        var response = await axios.get('/like', {
            params: {
                id: song.id,
                like: truefalse
            }
        });

        // Update the playlist of player screen
        if (self.likes.get('id') === player.meta.id) {
            let songs = player.songs;
            let index = songs.findIndex(e => e.id === song.id);

            if (index === -1) {
                // You like this song
                songs = [
                    song,
                    ...songs,
                ];
            } else {
                // Remove song from playlist
                songs = [
                    ...songs.slice(0, index),
                    ...songs.slice(index + 1, songs.length),
                ];
            }

            player.songs = songs;
        }

        return response.data.code === 200;
    }

    hasLogin() {
        return !!self.profile.userId;
    }
}

const self = new Me();
export default self;
