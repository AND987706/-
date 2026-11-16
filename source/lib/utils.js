"use strict";

/**
 * utils.js - 通用工具模块
 * 提供日志、路径、UI 线程更新、屏幕信息等基础能力
 */

var LOG_BUFFER = global.LOG_BUFFER || [];
global.LOG_BUFFER = LOG_BUFFER;

function pad2(n) {
    return n < 10 ? "0" + n : "" + n;
}

/** 带时间戳的日志，同时输出到控制台与内存缓冲区 */
function log(msg) {
    var d = new Date();
    var line = "[" + pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds()) + "] " + msg;
    LOG_BUFFER.push(line);
    if (LOG_BUFFER.length > 200) {
        LOG_BUFFER.shift();
    }
    try {
        console.log(line);
    } catch (e) {}
    return line;
}

function getLogs() {
    return LOG_BUFFER.slice();
}

function clearLogs() {
    LOG_BUFFER.length = 0;
}

/** 应用根目录（脚本所在目录） */
function root() {
    if (global.APP_DIR) {
        return global.APP_DIR;
    }
    try {
        if (typeof engines !== "undefined" && engines.myEngine) {
            return engines.myEngine().cwd();
        }
    } catch (e) {}
    try {
        return files.cwd();
    } catch (e) {
        return ".";
    }
}

/** 在 UI 线程安全地更新悬浮窗控件 */
function updateUI(fn) {
    if (typeof ui !== "undefined") {
        try {
            ui.run(fn);
            return;
        } catch (e) {}
    }
    try {
        fn();
    } catch (e2) {
        log("UI 更新失败: " + e2);
    }
}

function getScreenInfo() {
    var sdk = "-";
    try {
        sdk = device.sdkInt;
    } catch (e) {}
    var brand = "-";
    var model = "-";
    try {
        brand = device.brand;
        model = device.model;
    } catch (e) {}
    var activity = "-";
    try {
        activity = currentActivity();
    } catch (e) {}
    return {
        width: device.width,
        height: device.height,
        sdk: sdk,
        brand: brand,
        model: model,
        activity: activity
    };
}

function clamp(v, min, max) {
    if (v < min) return min;
    if (v > max) return max;
    return v;
}

module.exports = {
    log: log,
    getLogs: getLogs,
    clearLogs: clearLogs,
    root: root,
    updateUI: updateUI,
    getScreenInfo: getScreenInfo,
    clamp: clamp
};
