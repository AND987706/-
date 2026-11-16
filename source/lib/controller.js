"use strict";

/**
 * controller.js - 运行控制器
 * 负责任务的启动/暂停/恢复/停止/切换，使用独立线程执行动作序列，
 * 通过状态回调驱动 UI 更新。
 */

var utils = require("./utils.js");
var actions = require("./actions.js");

var MODE = {
    IDLE: "idle",
    RUNNING: "running",
    PAUSED: "paused"
};

function createController(configMgr) {
    var state = {
        mode: MODE.IDLE,
        taskIndex: 0,
        loop: 0,
        totalLoops: 0,
        action: 0,
        totalActions: 0,
        message: "空闲"
    };
    var listeners = [];
    var worker = null;
    var stopFlag = false;
    var pauseFlag = false;

    function emit() {
        var snapshot = getStatus();
        for (var i = 0; i < listeners.length; i++) {
            try {
                listeners[i](snapshot);
            } catch (e) {}
        }
    }

    function statusText() {
        var total = state.totalLoops < 0 ? "∞" : String(state.totalLoops);
        if (state.mode === MODE.RUNNING) {
            return "运行中 · 第 " + state.loop + "/" + total + " 轮 · 动作 " + state.action + "/" + state.totalActions;
        }
        if (state.mode === MODE.PAUSED) {
            return "已暂停 · 动作 " + state.action + "/" + state.totalActions;
        }
        return state.message || "空闲";
    }

    function getStatus() {
        var task = configMgr.getTask(state.taskIndex);
        return {
            mode: state.mode,
            taskIndex: state.taskIndex,
            taskName: task ? (task.name || "未命名任务") : "无任务",
            loop: state.loop,
            totalLoops: state.totalLoops,
            action: state.action,
            totalActions: state.totalActions,
            text: statusText()
        };
    }

    /** 在后台线程执行任务，避免阻塞悬浮窗 UI */
    function run(task) {
        var acts = task.actions || [];
        var loops = state.totalLoops;
        var interval = configMgr.getSettings().defaultInterval;
        if (task.interval !== undefined && task.interval !== null) {
            interval = task.interval;
        }

        try {
            var l = 0;
            while ((loops < 0 || l < loops) && !stopFlag) {
                state.loop = l + 1;
                for (var i = 0; i < acts.length && !stopFlag; i++) {
                    // 暂停等待
                    while (pauseFlag && !stopFlag) {
                        sleep(200);
                    }
                    if (stopFlag) {
                        break;
                    }
                    var a = acts[i];
                    if (a.enabled === false) {
                        continue;
                    }
                    state.action = i + 1;
                    emit();

                    // 动作前间隔（首个动作也等待，方便用户切换到目标界面）
                    var delay = a.delay === undefined ? interval : a.delay;
                    if (delay > 0) {
                        sleep(delay);
                    }
                    if (stopFlag) {
                        break;
                    }
                    actions.execute(a);
                }
                if (stopFlag) {
                    break;
                }
                l++;
            }
        } catch (e) {
            utils.log("任务执行异常: " + e);
        }

        if (stopFlag) {
            state.message = "已停止";
            utils.log("任务已停止");
        } else {
            state.message = "已完成";
            utils.log("任务已完成");
        }
        state.mode = MODE.IDLE;
        state.loop = 0;
        state.action = 0;
        emit();
    }

    function start() {
        if (state.mode === MODE.RUNNING) {
            utils.log("任务已在运行中");
            return false;
        }
        var task = configMgr.getTask(state.taskIndex);
        if (!task) {
            utils.log("当前没有可执行的任务");
            return false;
        }
        var acts = task.actions || [];
        if (acts.length === 0) {
            utils.log("该任务没有任何动作");
            return false;
        }
        stopFlag = false;
        pauseFlag = false;
        state.totalActions = acts.length;
        state.totalLoops = task.loop === undefined ? 1 : task.loop;
        state.loop = 0;
        state.action = 0;
        state.mode = MODE.RUNNING;
        state.message = "运行中";
        emit();
        utils.log("开始任务: " + (task.name || "未命名任务"));

        worker = threads.start(function () {
            run(task);
        });
        return true;
    }

    function pause() {
        if (state.mode !== MODE.RUNNING) {
            return false;
        }
        pauseFlag = true;
        state.mode = MODE.PAUSED;
        emit();
        utils.log("任务已暂停");
        return true;
    }

    function resume() {
        if (state.mode !== MODE.PAUSED) {
            return false;
        }
        pauseFlag = false;
        state.mode = MODE.RUNNING;
        emit();
        utils.log("任务已继续");
        return true;
    }

    /** 开始/暂停/继续 一键切换 */
    function toggle() {
        if (state.mode === MODE.RUNNING) {
            return pause();
        } else if (state.mode === MODE.PAUSED) {
            return resume();
        } else {
            return start();
        }
    }

    function stop() {
        if (state.mode === MODE.IDLE && !worker) {
            return false;
        }
        stopFlag = true;
        pauseFlag = false;
        state.mode = MODE.IDLE;
        state.message = "已停止";
        emit();
        utils.log("已发出停止信号");
        return true;
    }

    function changeTask(delta) {
        var count = configMgr.count();
        if (count === 0) {
            return false;
        }
        state.taskIndex = ((state.taskIndex + delta) % count + count) % count;
        state.loop = 0;
        state.action = 0;
        emit();
        return true;
    }

    function selectTask(index) {
        if (index < 0 || index >= configMgr.count()) {
            return false;
        }
        state.taskIndex = index;
        emit();
        return true;
    }

    function onStatus(fn) {
        listeners.push(fn);
        // 立即推送一次当前状态
        try {
            fn(getStatus());
        } catch (e) {}
    }

    function shutdown() {
        stopFlag = true;
        pauseFlag = false;
        if (worker) {
            try {
                worker.interrupt();
            } catch (e) {}
        }
    }

    return {
        MODE: MODE,
        start: start,
        pause: pause,
        resume: resume,
        toggle: toggle,
        stop: stop,
        changeTask: changeTask,
        selectTask: selectTask,
        getStatus: getStatus,
        onStatus: onStatus,
        shutdown: shutdown
    };
}

module.exports = {
    createController: createController,
    MODE: MODE
};
