"use strict";

/**
 * floatPanel.js - 悬浮控制面板
 * 提供可拖动的悬浮窗：开始/暂停、停止、上一个/下一个任务、退出
 */

var utils = require("./utils.js");

var panelXML = '<vertical id="root" bg="#E6212121" padding="10" w="180">' +
    '<text id="title" text="AutoTap 自动化" textColor="#FFFFFF" textSize="14sp" gravity="center" w="*"/>' +
    '<View h="1" bg="#55444444" w="*"/>' +
    '<text id="taskName" text="任务: -" textColor="#FFD54F" textSize="12sp" gravity="center" w="*"/>' +
    '<text id="status" text="空闲" textColor="#69F0AE" textSize="12sp" gravity="center" w="*"/>' +
    '<button id="btnToggle" text="开始" textSize="13sp" w="*" bg="#FF1976D2" textColor="#FFFFFF"/>' +
    '<horizontal w="*">' +
    '<button id="btnStop" text="停止" textSize="12sp" w="0" weight="1" bg="#FFC62828" textColor="#FFFFFF"/>' +
    '<button id="btnPrev" text="◀" textSize="12sp" w="0" weight="1"/>' +
    '<button id="btnNext" text="▶" textSize="12sp" w="0" weight="1"/>' +
    '</horizontal>' +
    '<button id="btnClose" text="退出" textSize="11sp" w="*" bg="#FF333333" textColor="#BBBBBB"/>' +
    '</vertical>';

function createPanel(controller, configMgr) {
    var win = floaty.window(panelXML);
    var settings = configMgr.getSettings();

    var posX = settings.panelX;
    var posY = settings.panelY;
    if (posX === undefined || posX < 0) {
        posX = device.width - 200;
    }
    try {
        win.setPosition(posX, posY);
    } catch (e) {}

    var btnToggleText = {
        "idle": "开始",
        "running": "暂停",
        "paused": "继续"
    };

    function render(s) {
        utils.updateUI(function () {
            try {
                win.taskName.setText("任务: " + s.taskName);
                win.status.setText(s.text);
                win.btnToggle.setText(btnToggleText[s.mode] || "开始");
            } catch (e) {}
        });
    }

    controller.onStatus(render);

    win.btnToggle.click(function () {
        controller.toggle();
    });

    win.btnStop.click(function () {
        controller.stop();
    });

    win.btnPrev.click(function () {
        controller.changeTask(-1);
    });

    win.btnNext.click(function () {
        controller.changeTask(1);
    });

    win.btnClose.click(function () {
        controller.shutdown();
        try {
            win.close();
        } catch (e) {}
        events.removeAllKeyListeners();
        utils.log("已退出 AutoTap");
        toast("AutoTap 已退出");
    });

    render(controller.getStatus());
    return win;
}

module.exports = {
    createPanel: createPanel
};
