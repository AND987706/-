"use strict";

/**
 * config.js - 配置管理模块
 * 负责读写任务配置(config/tasks.json)与全局设置(config/settings.json)
 */

var utils = require("./utils.js");

var TASKS_FILE = null;
var SETTINGS_FILE = null;

function ensurePaths() {
    if (TASKS_FILE && SETTINGS_FILE) {
        return;
    }
    var cfgDir = files.join(utils.root(), "config");
    if (!files.exists(cfgDir)) {
        files.createWithDirs(cfgDir);
    }
    TASKS_FILE = files.join(cfgDir, "tasks.json");
    SETTINGS_FILE = files.join(cfgDir, "settings.json");
}

/** 默认任务（当配置文件缺失时自动创建） */
function defaultTasks() {
    return [
        {
            "name": "示例：连续点击",
            "description": "每 1 秒点击一次坐标 (540, 960)，共 3 轮",
            "loop": 3,
            "interval": 1000,
            "actions": [
                { "type": "click", "x": 540, "y": 960, "label": "点击屏幕中央" },
                { "type": "wait", "ms": 500, "label": "等待 0.5 秒" }
            ]
        },
        {
            "name": "示例：上滑浏览",
            "description": "从屏幕下方滑到上方，共 5 轮",
            "loop": 5,
            "interval": 1200,
            "actions": [
                { "type": "swipe", "x1": 540, "y1": 1500, "x2": 540, "y2": 500, "duration": 500, "label": "向上滑动" }
            ]
        }
    ];
}

var DEFAULT_SETTINGS = {
    "designWidth": 1080,
    "designHeight": 1920,
    "defaultInterval": 800,
    "panelX": -1,
    "panelY": 120,
    "emergencyKey": "volume_down"
};

function loadTasks() {
    ensurePaths();
    try {
        if (!files.exists(TASKS_FILE)) {
            files.write(TASKS_FILE, JSON.stringify(defaultTasks(), null, 2), "utf-8");
            utils.log("已生成默认任务配置: " + TASKS_FILE);
        }
        var text = files.read(TASKS_FILE, "utf-8");
        var arr = JSON.parse(text);
        if (!(arr instanceof Array)) {
            throw new Error("任务配置根节点必须是数组");
        }
        return arr;
    } catch (e) {
        utils.log("读取任务配置失败: " + e);
        return defaultTasks();
    }
}

function saveTasks(tasks) {
    ensurePaths();
    try {
        files.write(TASKS_FILE, JSON.stringify(tasks, null, 2), "utf-8");
        utils.log("任务配置已保存");
        return true;
    } catch (e) {
        utils.log("保存任务配置失败: " + e);
        return false;
    }
}

function loadSettings() {
    ensurePaths();
    var settings = {};
    for (var k in DEFAULT_SETTINGS) {
        if (DEFAULT_SETTINGS.hasOwnProperty(k)) {
            settings[k] = DEFAULT_SETTINGS[k];
        }
    }
    try {
        if (!files.exists(SETTINGS_FILE)) {
            files.write(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
        } else {
            var text = files.read(SETTINGS_FILE, "utf-8");
            var loaded = JSON.parse(text);
            for (var key in DEFAULT_SETTINGS) {
                if (DEFAULT_SETTINGS.hasOwnProperty(key) && loaded[key] !== undefined) {
                    settings[key] = loaded[key];
                }
            }
        }
    } catch (e) {
        utils.log("读取设置失败，使用默认值: " + e);
    }
    return settings;
}

function saveSettings(settings) {
    ensurePaths();
    try {
        files.write(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
        return true;
    } catch (e) {
        utils.log("保存设置失败: " + e);
        return false;
    }
}

/**
 * 创建配置管理器实例
 */
function createConfigManager() {
    var tasks = loadTasks();
    var settings = loadSettings();

    return {
        getTasks: function () {
            return tasks;
        },
        getTask: function (index) {
            if (index < 0 || index >= tasks.length) {
                return null;
            }
            return tasks[index];
        },
        count: function () {
            return tasks.length;
        },
        reload: function () {
            tasks = loadTasks();
            settings = loadSettings();
            utils.log("配置已重新加载，共 " + tasks.length + " 个任务");
            return tasks;
        },
        getSettings: function () {
            return settings;
        },
        saveSettings: function (s) {
            settings = s;
            return saveSettings(s);
        },
        saveTasks: function (t) {
            tasks = t;
            return saveTasks(t);
        },
        tasksFile: function () {
            ensurePaths();
            return TASKS_FILE;
        }
    };
}

module.exports = {
    createConfigManager: createConfigManager,
    loadTasks: loadTasks,
    saveTasks: saveTasks,
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    defaultTasks: defaultTasks
};
