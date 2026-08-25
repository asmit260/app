// Supabase Client — LocalStorage Mock DB (shared with website)
// Uses the SAME storage keys as the website so data syncs between both

const STORAGE_KEY = 'anitrack_mock_db';
const SESSION_KEY = 'anitrack_mock_session';

class LocalStorageMockDb {
  constructor() {
    this.initDb();
  }

  initDb() {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          profiles: {},
          watchlist: {},
          custom_lists: {},
          custom_list_items: {},
          episode_progress: {},
          calendar_events: {},
          news_articles: {}
        }));
      }
    } catch (e) {
      console.error("initDb storage error:", e);
    }
  }

  getDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { profiles: {}, watchlist: {}, custom_lists: {}, custom_list_items: {}, episode_progress: {}, calendar_events: {}, news_articles: {} };
      const parsed = JSON.parse(raw);
      if (!parsed.custom_lists) parsed.custom_lists = {};
      if (!parsed.custom_list_items) parsed.custom_list_items = {};
      if (!parsed.profiles) parsed.profiles = {};
      if (!parsed.watchlist) parsed.watchlist = {};
      if (!parsed.episode_progress) parsed.episode_progress = {};
      if (!parsed.calendar_events) parsed.calendar_events = {};
      if (!parsed.news_articles) parsed.news_articles = {};
      return parsed;
    } catch (e) {
      console.error("getDb parse error, resetting:", e);
      const resetDb = { profiles: {}, watchlist: {}, custom_lists: {}, custom_list_items: {}, episode_progress: {}, calendar_events: {}, news_articles: {} };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(resetDb)); } catch (_) {}
      return resetDb;
    }
  }

  saveDb(db) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) {
      console.error("saveDb storage error:", e);
    }
  }

  getCurrentUserId() {
    try {
      const sess = localStorage.getItem(SESSION_KEY);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed?.user?.id) return parsed.user.id;
      }
    } catch (_) {}
    return 'local_user';
  }

  // Auth implementation
  auth = {
    signUp: async ({ email, password, options }) => {
      const db = this.getDb();
      const user = {
        id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
        email,
        raw_user_meta_data: options?.data || {}
      };
      
      db.profiles[user.id] = {
        id: user.id,
        _email: email,
        username: options?.data?.username || email.split('@')[0],
        display_name: options?.data?.display_name || 'Anime Fan',
        avatar_url: '',
        bio: 'Just another anime lover!',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
        title_language: 'english',
        theme: 'light',
        notifications_enabled: false,
        notification_lead_minutes: 15,
        calendar_alert_lead_minutes: 15,
        created_at: new Date().toISOString()
      };
      this.saveDb(db);
      
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
      window.dispatchEvent(new CustomEvent('anitrack-auth-change'));
      return { data: { user }, error: null };
    },

    signInWithPassword: async ({ email, password }) => {
      const db = this.getDb();
      
      const existingUser = Object.entries(db.profiles).find(([id, profile]) => {
        return profile._email === email;
      });

      let user;
      if (existingUser) {
        const [userId, profile] = existingUser;
        user = {
          id: userId,
          email,
          raw_user_meta_data: { display_name: profile.display_name, username: profile.username }
        };
      } else {
        const emailHash = email.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
        const userId = 'mock-user-' + Math.abs(emailHash).toString(36);
        user = {
          id: userId,
          email,
          raw_user_meta_data: { display_name: email.split('@')[0], username: email.split('@')[0] }
        };
        if (!db.profiles[userId]) {
          db.profiles[userId] = {
            id: userId,
            _email: email,
            username: email.split('@')[0],
            display_name: email.split('@')[0],
            avatar_url: "",
            bio: "Just another anime lover!",
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
            title_language: 'english',
            theme: 'light',
            notifications_enabled: false,
            notification_lead_minutes: 15,
            calendar_alert_lead_minutes: 15,
            created_at: new Date().toISOString()
          };
          this.saveDb(db);
        }
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
      window.dispatchEvent(new CustomEvent('anitrack-auth-change'));
      return { data: { user }, error: null };
    },

    signInWithOAuth: async ({ provider }) => {
      const user = {
        id: 'mock-user-oauth',
        email: 'oauth-user@example.com',
        raw_user_meta_data: { display_name: "Google User", username: "google_user" }
      };
      const db = this.getDb();
      if (!db.profiles[user.id]) {
        db.profiles[user.id] = {
          id: user.id,
          username: "google_user",
          display_name: "Google User",
          avatar_url: "",
          bio: "Connected via Google OAuth",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo',
          title_language: 'english',
          theme: 'light',
          notifications_enabled: false,
          notification_lead_minutes: 15,
          calendar_alert_lead_minutes: 15,
          created_at: new Date().toISOString()
        };
        this.saveDb(db);
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ user }));
      window.dispatchEvent(new CustomEvent('anitrack-auth-change'));
      return { data: { user }, error: null };
    },

    signOut: async () => {
      localStorage.removeItem(SESSION_KEY);
      window.dispatchEvent(new CustomEvent('anitrack-auth-change'));
      return { error: null };
    },

    getSession: async () => {
      try {
        const session = localStorage.getItem(SESSION_KEY);
        return { data: { session: session ? JSON.parse(session) : null }, error: null };
      } catch (e) {
        return { data: { session: null }, error: null };
      }
    },

    onAuthStateChange: (callback) => {
      const handler = () => {
        try {
          const session = localStorage.getItem(SESSION_KEY);
          callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session ? JSON.parse(session) : null);
        } catch (e) {
          callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', (e) => {
        if (e.key === SESSION_KEY) handler();
      });
      window.addEventListener('anitrack-auth-change', handler);
      try {
        const session = localStorage.getItem(SESSION_KEY);
        callback(session ? 'INITIAL_SESSION' : 'NO_SESSION', session ? JSON.parse(session) : null);
      } catch (e) {
        callback('NO_SESSION', null);
      }
      return { data: { subscription: { unsubscribe: () => {
        window.removeEventListener('anitrack-auth-change', handler);
      } } } };
    }
  };

  // Mock Database querying
  from(tableName) {
    const db = this.getDb();
    const tableData = db[tableName] || {};
    const userId = this.getCurrentUserId();

    return {
      select: (fields) => {
        let results = Object.values(tableData);
        results = results.filter(row => !row.user_id || row.user_id === userId || row.id === userId || (userId === 'local_user' && !row.user_id));

        const makeQueryBuilder = (initialResults) => {
          let currentResults = [...initialResults];
          
          const builder = {
            eq: (field, val) => {
              currentResults = currentResults.filter(row => {
                const rowVal = row[field];
                return rowVal == val || String(rowVal) === String(val) || (field === 'id' && (row.id == val || String(row.id) === String(val)));
              });
              return builder;
            },
            in: (field, vals) => {
              currentResults = currentResults.filter(row => Array.isArray(vals) && vals.map(String).includes(String(row[field])));
              return builder;
            },
            order: (orderField, { ascending } = { ascending: true }) => {
              currentResults.sort((a, b) => {
                const valA = a[orderField] || '';
                const valB = b[orderField] || '';
                if (valA < valB) return ascending ? -1 : 1;
                if (valA > valB) return ascending ? 1 : -1;
                return 0;
              });
              return builder;
            },
            single: () => {
              return { data: currentResults[0] || null, error: null };
            },
            maybeSingle: () => {
              return { data: currentResults[0] || null, error: null };
            },
            then: (onfulfilled) => {
              return Promise.resolve({ data: currentResults, error: null }).then(onfulfilled);
            },
            data: currentResults,
            error: null
          };
          
          return builder;
        };

        return makeQueryBuilder(results);
      },
      insert: (rows) => {
        const isArray = Array.isArray(rows);
        const rowList = isArray ? rows : [rows];
        const inserted = [];
        
        rowList.forEach(row => {
          let primaryKey;
          if (row.id) {
            primaryKey = row.id;
          } else if (row.anime_id && row.episode_number !== undefined && row.episode_number !== null) {
            primaryKey = `${userId}_${row.anime_id}_${row.episode_number}`;
          } else if (row.anime_id) {
            primaryKey = `${userId}_${row.anime_id}`;
          } else {
            primaryKey = 'gen_' + Math.random().toString(36).substr(2, 9);
          }

          const newRecord = {
            id: primaryKey,
            ...row,
            user_id: row.user_id || userId,
            created_at: row.created_at || new Date().toISOString()
          };
          tableData[primaryKey] = newRecord;
          inserted.push(newRecord);
        });

        db[tableName] = tableData;
        this.saveDb(db);

        const resultData = isArray ? inserted : inserted[0];
        const builder = {
          select: () => builder,
          single: () => ({ data: resultData, error: null }),
          maybeSingle: () => ({ data: resultData, error: null }),
          then: (onfulfilled) => Promise.resolve({ data: resultData, error: null }).then(onfulfilled),
          data: resultData,
          error: null
        };
        return builder;
      },
      upsert: async (row) => {
        let primaryKey;
        if (row.id) {
          primaryKey = row.id;
        } else if (row.anime_id && row.episode_number !== undefined && row.episode_number !== null) {
          primaryKey = `${userId}_${row.anime_id}_${row.episode_number}`;
        } else if (row.anime_id) {
          primaryKey = `${userId}_${row.anime_id}`;
        } else {
          primaryKey = userId;
        }
        
        const existingRow = tableData[primaryKey] || {};
        const defaultFields = tableName === 'watchlist' ? { calendar_sync: true } : {};
        
        tableData[primaryKey] = {
          ...defaultFields,
          ...existingRow,
          ...row,
          id: primaryKey,
          user_id: userId,
          updated_at: new Date().toISOString()
        };
        db[tableName] = tableData;
        this.saveDb(db);
        return { data: tableData[primaryKey], error: null };
      },
      update: (fields) => {
        const filters = [];
        const self = this;
        const updateBuilder = {
          match: async (matchFields) => {
            let matches = Object.entries(tableData).filter(([key, val]) => {
              return Object.entries(matchFields).every(([k, v]) => (val[k] == v || String(val[k]) === String(v)) && (val.user_id === userId || !val.user_id));
            });
            matches.forEach(([key, val]) => {
              tableData[key] = { ...val, ...fields, updated_at: new Date().toISOString() };
            });
            db[tableName] = tableData;
            self.saveDb(db);
            return { data: matches.map(([k]) => tableData[k]), error: null };
          },
          eq: (field, val) => {
            filters.push({ field, val });
            return updateBuilder;
          },
          then: (onfulfilled) => {
            let matches = Object.entries(tableData).filter(([key, row]) => {
              const matchesAll = filters.every(f => row[f.field] == f.val || String(row[f.field]) === String(f.val) || (f.field === 'id' && (key == f.val || String(key) === String(f.val))));
              const ownerMatch = !row.user_id || row.user_id === userId || filters.some(f => f.field === 'user_id');
              return matchesAll && ownerMatch;
            });
            matches.forEach(([key, row]) => {
              tableData[key] = { ...row, ...fields, updated_at: new Date().toISOString() };
            });
            db[tableName] = tableData;
            self.saveDb(db);
            return Promise.resolve({ data: matches.map(([k]) => tableData[k]), error: null }).then(onfulfilled);
          }
        };
        return updateBuilder;
      },
      delete: () => {
        const filters = [];
        const self = this;
        const deleteBuilder = {
          match: async (matchFields) => {
            let deletedCount = 0;
            Object.entries(tableData).forEach(([key, row]) => {
              const matchesAll = Object.entries(matchFields).every(([k, v]) => (row[k] == v || String(row[k]) === String(v)));
              const ownerMatch = !row.user_id || row.user_id === userId || matchFields.user_id;
              if (matchesAll && ownerMatch) {
                delete tableData[key];
                deletedCount++;
              }
            });
            db[tableName] = tableData;
            self.saveDb(db);
            return { data: { count: deletedCount }, error: null };
          },
          eq: (field, val) => {
            filters.push({ field, val });
            return deleteBuilder;
          },
          then: (onfulfilled) => {
            let deletedCount = 0;
            Object.entries(tableData).forEach(([key, row]) => {
              const matchesAll = filters.every(f => row[f.field] == f.val || String(row[f.field]) === String(f.val) || (f.field === 'id' && (key == f.val || String(key) === String(f.val))));
              const ownerMatch = !row.user_id || row.user_id === userId || filters.some(f => f.field === 'user_id');
              if (matchesAll && ownerMatch) {
                delete tableData[key];
                deletedCount++;
              }
            });
            db[tableName] = tableData;
            self.saveDb(db);
            return Promise.resolve({ data: { count: deletedCount }, error: null }).then(onfulfilled);
          }
        };
        return deleteBuilder;
      }
    };
  }
}

const supabaseInstance = new LocalStorageMockDb();
export const supabase = supabaseInstance;
export const isMock = true;
