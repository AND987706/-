"use strict";

/**
 * main.js - AutoTap 主入口
 * 安卓自动点击/滑动脚本程序（基于 Auto.js）
 *
 * 使用方法：
 * 1. 安装 Auto.js / AutoX.js，并开启无障碍服务
 * 2. 将整个 AutoTap 目录导入到手机
 * 3. 在 Auto.js 中打开 main.js 并运行
 * 4. 通过悬浮窗控制任务，按音量键可紧急停止
 */

// 记录脚本根目录，供各模块定位配置文件
global.APP_DIR = (function () {
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
})();

var utils = require("./lib/utils.js");
var config = require("./lib/config.js");
var controllerModule = require("./lib/controller.js");
var panel = require("./lib/floatPanel.js");

utils.log("========== AutoTap 启动 ==========");

// 1. 等待无障碍服务就绪（自动点击/滑动必需）
utils.log("正在等待无障碍服务...");
auto.waitFor();
utils.log("无障碍服务已就绪");

// 2. 加载配置
var configMgr = config.createConfigManager();
var settings = configMgr.getSettings();

// 3. 全局坐标适配：任务中的坐标按设计分辨率编写，自动换算到当前屏幕
try {
    var dw = parseInt(settings.designWidth, 10) || 1080;
    var dh = parseInt(settings.designHeight, 10) || 1920;
    setScreenMetrics(dw, dh);
    var info = utils.getScreenInfo();
    utils.log("屏幕: " + info.width + "x" + info.height + " | 设计基准: " + dw + "x" + dh);
} catch (e) {
    utils.log("屏幕适配设置失败: " + e);
}

// 4. 创建控制器与悬浮面板
var controller = controllerModule.createController(configMgr);
var win = panel.createPanel(controller, configMgr);

// 5. 音量键紧急停止
function setupEmergencyKey() {
    try {
        events.observeKey();
        var key = settings.emergencyKey || "volume_down";
        var targetCode = key === "volume_up" ? keys.volume_up : keys.volume_down;
        events.on("key_down", function (keyCode, event) {
            if (keyCode === targetCode) {
                var s = controller.getStatus();
                if (s.mode !== "idle") {
                    controller.stop();
                    toast("已紧急停止");
                    utils.log("用户通过音量键紧急停止");
                }
            }
        });
        utils.log("紧急停止键: " + (key === "volume_up" ? "音量+" : "音量-"));
    } catch (e) {
        utils.log("注册音量键监听失败: " + e);
    }
}
setupEmergencyKey();

// 6. 脚本退出时清理监听
events.on("exit", function () {
    try {
        controller.shutdown();
    } catch (e) {}
    try {
        events.removeAllKeyListeners();
    } catch (e) {}
    utils.log("========== AutoTap 退出 ==========");
});

toast("AutoTap 已就绪，共 " + configMgr.count() + " 个任务");
utils.log("已加载 " + configMgr.count() + " 个任务，点击悬浮窗“开始”运行");

// 7. 保持脚本常驻
setInterval(function () {}, 1000);
