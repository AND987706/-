"use strict";

/**
 * actions.js - 动作执行器
 * 负责执行单条动作：点击、长按、滑动、手势、输入、按键、查找控件、等待等
 */

var utils = require("./utils.js");

/** 按键名称到 Auto.js 按键函数的映射 */
var KEY_HANDLERS = {
    "back": function () { back(); },
    "home": function () { home(); },
    "recents": function () { recents(); },
    "recent": function () { recents(); },
    "power": function () { powerDialog(); },
    "powerdialog": function () { powerDialog(); },
    "notification": function () { notifications(); },
    "notifications": function () { notifications(); },
    "quicksettings": function () { quickSettings(); },
    "lockscreen": function () { lockScreen(); }
};

function doKey(key) {
    if (key === null || key === undefined) {
        utils.log("按键动作缺少 key 参数");
        return false;
    }
    var name = String(key).toLowerCase();
    var handler = KEY_HANDLERS[name];
    if (handler) {
        handler();
        return true;
    }
    // 支持数字 keycode 或 "KEYCODE_XXX" 字符串
    try {
        var code = /^\d+$/.test(name) ? parseInt(name, 10) : keycode(name.toUpperCase());
        press(code);
        return true;
    } catch (e) {
        utils.log("未知按键: " + key + " (" + e + ")");
        return false;
    }
}

/** 根据类型构建控件选择器 */
function buildSelector(action) {
    var v = action.value === undefined ? "" : String(action.value);
    var t = action.type;
    if (t === "findText") {
        return action.contains ? textContains(v) : text(v);
    }
    if (t === "findId") {
        return id(v);
    }
    if (t === "findDesc") {
        return action.contains ? descContains(v) : desc(v);
    }
    if (t === "findClass") {
        return className(v);
    }
    if (t === "findTextRegex") {
        return textMatches(v);
    }
    return null;
}

/** 查找控件并执行点击/获取文本 */
function findAndAct(action) {
    var selector = buildSelector(action);
    if (!selector) {
        utils.log("不支持的查找类型: " + action.type);
        return false;
    }
    var timeout = action.timeout || 3000;
    var index = action.index || 0;
    var obj = null;
    try {
        if (index > 0) {
            var all = selector.findAll(timeout);
            if (all && all.length > index) {
                obj = all[index];
            }
        } else {
            obj = selector.findOne(timeout);
        }
    } catch (e) {
        utils.log("查找控件出错: " + e);
        return false;
    }
    if (!obj) {
        utils.log("未找到控件: " + action.value);
        return false;
    }
    try {
        var mode = action.mode || "click";
        if (mode === "text") {
            utils.log("控件文本: " + obj.text());
        } else if (mode === "bounds") {
            var b = obj.bounds();
            utils.log("控件位置: [" + b.left + "," + b.top + "," + b.right + "," + b.bottom + "]");
        } else if (mode === "none") {
            // 仅判断存在
        } else {
            if (action.clickByCoord) {
                var bb = obj.bounds();
                click(bb.centerX(), bb.centerY());
            } else {
                obj.click();
            }
        }
    } catch (e) {
        utils.log("操作控件出错: " + e);
        return false;
    }
    return true;
}

/**
 * 执行单条动作
 * @param {Object} action 动作配置
 * @returns {boolean} 是否执行成功
 */
function execute(action) {
    if (!action || !action.type) {
        utils.log("跳过空动作");
        return false;
    }
    var t = action.type;
    var label = action.label || t;
    var ok = true;
    try {
        switch (t) {
            case "click":
                click(action.x, action.y);
                break;
            case "longClick":
                longClick(action.x, action.y);
                break;
            case "tap":
                tap(action.x, action.y, action.duration || 100);
                break;
            case "swipe":
                swipe(action.x1, action.y1, action.x2, action.y2, action.duration || 500);
                break;
            case "gesture":
                var pts = action.points || [];
                if (pts.length < 1) {
                    utils.log("手势动作缺少 points");
                    ok = false;
                    break;
                }
                var args = [action.duration || 500];
                for (var i = 0; i < pts.length; i++) {
                    args.push(pts[i][0], pts[i][1]);
                }
                gesture.apply(null, args);
                break;
            case "input":
                input(action.text || "");
                break;
            case "key":
                ok = doKey(action.key);
                break;
            case "wait":
                sleep(action.ms || 1000);
                break;
            case "toast":
                toast(action.text || "");
                break;
            case "findText":
            case "findId":
            case "findDesc":
            case "findClass":
            case "findTextRegex":
                ok = findAndAct(action);
                break;
            case "screenshot":
                try {
                    var dir = files.join(utils.root(), "screenshots");
                    if (!files.exists(dir)) {
                        files.createWithDirs(dir);
                    }
                    var p = files.join(dir, "screen_" + Date.now() + ".png");
                    captureScreen(p);
                    utils.log("截图已保存: " + p);
                } catch (e) {
                    utils.log("截图失败（部分设备需无障碍/前台服务）: " + e);
                    ok = false;
                }
                break;
            default:
                utils.log("未知动作类型: " + t);
                ok = false;
        }
    } catch (e) {
        utils.log("动作执行失败 [" + label + "]: " + e);
        ok = false;
    }
    utils.log((ok ? "完成" : "失败") + ": " + label);
    return ok;
}

module.exports = {
    execute: execute,
    doKey: doKey
};
