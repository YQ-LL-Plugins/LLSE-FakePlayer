import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";
import { BetterSimpleForm, BetterCustomForm } from "../Gui/BetterForms.js";
import { PermManager } from "../Utils/PermManager.js";
import { 
    CalcPosFromViewDirection, IsNumberInt, IsValidDimId, ParsePositionString, EntityGetFeetPos 
} from "../Utils/Utils.js";
import { 
    _DEFAULT_PLAYER_SELECT_SLOT, _LONG_OPERATIONS_LIST, _SHORT_OPERATIONS_LIST, 
    _VALID_DIMENSION_NAMES, SUCCESS 
} from "../Utils/GlobalVars.js";

export class FpGuiForms
{
    ////// Tool dialogs
    static sendSuccessForm(player, infoText, callback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 操作成功", 
            "§a§l成功:§r\n" + infoText, "OK", "关闭", (pl, res)=>{ callback(pl); });
    }

    static sendErrorForm(player, errMsg, callback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 错误", 
            "§c§l发生错误:§r\n" + errMsg, "OK", "关闭", (pl, res)=>{ callback(pl); });
    }

    static sendInfoForm(player, infoText, callback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 消息", infoText, "OK", "关闭", (pl, res)=>{ callback(pl); });
    }

    static sendAskForm(player, askText, confirmCallback = function(pl){}, rejectCallback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 询问确认", askText, "确认", "取消", 
            (pl, res) => {
                if(res)
                    confirmCallback(pl);
                else 
                    rejectCallback(pl);
            });
    }

    static sendSuccessMsg(player, infoText)
    {
        player.tell("[FakePlayer] §a§l成功§r\n" + infoText);
    }

    static sendErrorMsg(player, errMsg)
    {
        player.tell("[FakePlayer] §c§l发生错误§r\n" + errMsg);
    }


    //////// Main forms
    // main
    static sendMainMenu(player)
    {
        let fm = new BetterSimpleForm("LLSE-FakePlayer 主菜单", "§e请选择操作：§r");
        fm.addButton("假人列表", "textures/ui/FriendsDiversity", (pl) => { FpGuiForms.sendFpListForm(pl); });
        fm.addButton("假人快速上下线", "textures/ui/move", (pl) => { FpGuiForms.sendQuickOnOfflineForm(pl);});
        fm.addButton("假人执行操作", "textures/items/iron_pickaxe", (pl) => { FpGuiForms.sendOperationMenu(pl); });
        // if(PermManager.isSu(player))
        // {
        //     fm.addButton("System Settings", "textures/ui/settings_glyph_color_2x", (pl) => {});
        // }
        fm.addButton("帮助", "textures/ui/infobulb", (pl) => {
            FpGuiForms.sendInfoForm(pl, FakePlayerManager.getHelp()[1], (pl) => { FpGuiForms.sendMainMenu(pl); });
        });
        fm.addButton("关闭", "");
        fm.send(player);
    }

    // fake player list
    static sendFpListForm(player)
    {
        let fm = new BetterSimpleForm("LLSE-FakePlayer 假人列表", "§e所有假人列表：§r");
        if(PermManager.checkPermToCreateNewFp(player))
        {
            fm.addButton("创建新假人", "textures/ui/color_plus", (pl) => {
                FpGuiForms.sendCreateNewForm(player);
            });
        }
        FakePlayerManager.forEachFp((fpName, fp) => {
            let statusStr = fp.isOnline() ? "§a在线§r" : "§4离线§r";
            fm.addButton(`${fpName} - ${statusStr}`, "", (pl) => { FpGuiForms.sendFpInfoForm(pl, fpName); });
        });
        fm.addButton("上线所有假人", "textures/ui/up_arrow", (pl) =>
        {
            let successNames = [];
            let result = "";
            [result, successNames] = FakePlayerManager.onlineAll(player);

            let namesList = "";
            for(let name of successNames)
                namesList += `§6${name}§r, `;
            namesList = namesList.substring(0, namesList.length - 2);
            if(result == SUCCESS)
                FpGuiForms.sendSuccessForm(pl, "所有假人已上线：\n" + namesList, 
                    (pl) => {FpGuiForms.sendFpListForm(pl);});
            else
                FpGuiForms.sendSuccessForm(pl, "上线过程中发生错误：" + result 
                    + "\n这些假人已经全部上线：\n" + namesList, 
                    (pl) => {FpGuiForms.sendFpListForm(pl);});
        });
        fm.addButton("下线所有假人", "textures/ui/down_arrow", (pl) => 
        {
            let successNames = [];
            let result = "";
            [result, successNames] = FakePlayerManager.offlineAll(player);

            let namesList = "";
            for(let name of successNames)
                namesList += `§6${name}§r, `;
            namesList = namesList.substring(0, namesList.length - 2);
            if(result == SUCCESS)
                FpGuiForms.sendSuccessForm(pl, "所有假人已下线：\n" + namesList, 
                    (pl) => {FpGuiForms.sendFpListForm(pl);});
            else
                FpGuiForms.sendSuccessForm(pl, "下线过程中发生错误：" + result 
                    + "\n这些假人已经全部下线：\n" + namesList, 
                    (pl) => {FpGuiForms.sendFpListForm(pl);});
        });
        fm.addButton("返回上一级", "", (pl) => { FpGuiForms.sendMainMenu(pl); });
        fm.send(player);
    }
    
    // create new fakeplayer
    static sendCreateNewForm(player)
    {
        let fm = new BetterCustomForm("LLSE-FakePlayer 创建新假人");
        fm.addLabel("label1", "提示：如果你把假人坐标框留空，假人将创建在你的面前");
        fm.addInput("name", "假人名字：", "new name");
        fm.addInput("coords", "假人坐标: (x y z)", "315 70 233");
        fm.addDropdown("dimid", "目标维度：", _VALID_DIMENSION_NAMES, player.pos.dimid);
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendFpListForm(pl); })
        fm.setSubmitCallback((pl, resultObj) => {
            // get name
            let fpName = resultObj.get("name");
            if(fpName.length == 0)
            {
                FpGuiForms.sendErrorForm(pl, "无法创建，你必须填写假人名字",
                    (pl) => { FpGuiForms.sendFpListForm(pl); });
                return;
            }

            // get position
            let spawnPos = new FloatPos(0, 32767, 0, 0);
            let coords = ParsePositionString(resultObj.get("coords"));
            let dimid = resultObj.get("dimid");

            if(!coords || !IsValidDimId(dimid))     // bad format
            {
                spawnPos = CalcPosFromViewDirection(EntityGetFeetPos(pl), pl.direction, 1);
            }
            else
            {
                spawnPos.x = coords.x;
                spawnPos.y = coords.y;
                spawnPos.z = coords.z;
                spawnPos.dimid = dimid;
            }

            // Create
            let result = FakePlayerManager.createNew(fpName, spawnPos.x, spawnPos.y, spawnPos.z, 
                spawnPos.dimid, pl.realName, pl);
            if(result != SUCCESS)
            {
                FpGuiForms.sendErrorForm(pl, result, (pl) => {FpGuiForms.sendFpListForm(pl);});
                return;
            }
            // Created by owner, so must have perm to online.
            // Online it
            result = FakePlayerManager.online(fpName);
            if(result != SUCCESS)
            {
                FpGuiForms.sendErrorForm(pl, result, (pl) => {FpGuiForms.sendFpListForm(pl);});
                return;
            }
            FpGuiForms.sendFpListForm(pl);
            //FpGuiForms.sendSuccessForm(pl, `§6${fpName}§r created`, (pl) => {FpGuiForms.sendFpListForm(pl);});
        });
        fm.send(player);
    }

    // get fakeplayer detailed info
    static sendFpInfoForm(player, fpName)
    {
        let resultData = FakePlayerManager.getAllInfo(fpName);
        if(resultData[0] != SUCCESS)
            FpGuiForms.sendErrorForm(player, resultData[0], (pl) => { FpGuiForms.sendFpListForm(pl); });
        else
        {
            let result = resultData[1];
            let posObj = new FloatPos(eval(result.pos.x), eval(result.pos.y), eval(result.pos.z), eval(result.pos.dimid));
            let syncPlayerName = data.xuid2name(result.syncXuid);
            let ownerName = result.ownerName;
            if(ownerName == player.realName)
                ownerName = "§6$" + ownerName + "§r";

            let fm = new BetterSimpleForm("LLSE-FakePlayer 假人信息");
            fm.setContent(`§6${fpName}§r假人信息：\n`
                + `- 坐标： ${posObj.toString()}\n`
                + `- 执行操作： ${result.operation ? result.operation : "None"}\n`
                + `- 同步玩家： ${syncPlayerName ? syncPlayerName : "None"}\n`
                + `- 状态： ${result.isOnline ? "§a§l在线§r" : "§c§l离线§r"}\n`
                + `- 所有者： ${ownerName}`
            );
            if(result.isOnline && PermManager.hasPermission(player, "offline", fpName))
            {
                fm.addButton("下线当前假人", "textures/ui/down_arrow", (pl) => {
                    // offline fakeplayer
                    let result = FakePlayerManager.offline(fpName);
                    if(result == SUCCESS)
                        FpGuiForms.sendFpInfoForm(pl, fpName);
                        //FpGuiForms.sendSuccessForm(pl, `§6${fpName}§r is offline`, (pl) => {FpGuiForms.sendFpInfoForm(pl, fpName);});
                    else
                        FpGuiForms.sendErrorForm(pl, result, (pl) => {FpGuiForms.sendFpInfoForm(pl, fpName);});
                });
            }
            if (!result.isOnline && PermManager.hasPermission(player, "online", fpName))
            {
                fm.addButton("上线当前假人", "textures/ui/up_arrow", (pl) => {
                    // online fakeplayer
                    let result = FakePlayerManager.online(fpName);
                    if(result == SUCCESS)
                        FpGuiForms.sendFpInfoForm(pl, fpName);
                        //FpGuiForms.sendSuccessForm(pl, `§6${fpName}§r is online`, (pl) => {FpGuiForms.sendFpInfoForm(pl, fpName);});
                    else
                        FpGuiForms.sendErrorForm(pl, result, (pl) => {FpGuiForms.sendFpInfoForm(pl, fpName);});
                });
            }
            if(PermManager.hasPermission(player, "remove", fpName))
            {
                fm.addButton("删除此假人", "textures/ui/cancel", (pl)=> {
                    // remove fakeplayer
                    FpGuiForms.sendAskForm(player, 
                        `你确定要删除假人§6${fpName}§r吗？\n他所有的数据将被清除，且无法恢复。`,
                        (pl)=>
                    {
                        let removeResult = FakePlayerManager.remove(fpName);
                        if(removeResult != SUCCESS)
                            FpGuiForms.sendErrorForm(pl, removeResult, (pl) => {FpGuiForms.sendFpInfoForm(pl, fpName);});
                        else
                            FpGuiForms.sendFpListForm(pl);
                    }, (pl)=>
                    {
                        FpGuiForms.sendFpInfoForm(pl, fpName);
                    });
                });
            }
            fm.addButton("假人物品栏操作", "textures/ui/inventory_icon", (pl) => { FpGuiForms.sendInventoryMenu(pl, fpName); })
            fm.addButton("返回上一级", "", (pl) => { FpGuiForms.sendFpListForm(pl); });
            fm.send(player);
        }
    }

    // Quick online / offline menu
    static sendQuickOnOfflineForm(player)
    {
        let fm = new BetterCustomForm("LLSE-FakePlayer 假人快速上下线");
        fm.addLabel('label1', '§e设置状态完毕后，点击“提交”执行操作：§r\n');

        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "online", fpName) && PermManager.hasPermission(player, "offline", fpName))
            {
                let isOnline = fp.isOnline();
                let statusStr = isOnline ? "在线" : "离线";
                let prefix = isOnline ? "§a" : "§c";
                fm.addSwitch(fpName, `${prefix}${fpName} - ${statusStr}§r`, isOnline ? true : false);
            }
        });
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendMainMenu(pl); });
        fm.setSubmitCallback((pl, resultObj) => 
        {
            let resultText = "";
            resultObj.forEach((fpName, nowStatus) => {
                let fp = FakePlayerManager.getFpInstance(fpName);
                if(!fp)
                    return;
                if(fp.isOnline() && !nowStatus)
                {
                    // need offline
                    let result = FakePlayerManager.offline(fpName);
                    if(result == SUCCESS)
                        resultText += `§6${fpName}§r已下线\n`;
                    else
                        resultText += `§6${fpName}§r下线失败：` + result + "\n";
                }
                else if(!fp.isOnline() && nowStatus)
                {
                    // need online
                    let result = FakePlayerManager.online(fpName);
                    if(result == SUCCESS)
                        resultText += `§6${fpName}§r已上线\n`;
                    else
                        resultText += `§6${fpName}§r上线失败：` + result + "\n";
                }
            });
            FpGuiForms.sendSuccessMsg(pl, resultText);
        });
        fm.send(player);
    }

    // fakeplayer operation select menu
    static sendOperationMenu(player)
    {
        let fm = new BetterSimpleForm("LLSE-FakePlayer 假人操作菜单");
        fm.setContent("§e请选择操作：§r");

        fm.addButton("执行/清除假人操作", "", (pl)=>{ FpGuiForms.sendDoClearOpMenu(pl); });
        fm.addButton("假人走向指定坐标", "", (pl)=>{ FpGuiForms.sendWalkToPosForm(pl); });
        fm.addButton("假人走向指定玩家", "", (pl)=>{ FpGuiForms.sendWalkToPlayerForm(pl); });
        fm.addButton("假人传送到指定坐标", "", (pl)=>{ FpGuiForms.sendTpToPosForm(pl); });
        fm.addButton("假人传送到指定玩家", "", (pl)=>{ FpGuiForms.sendTpToPlayerForm(pl); });
        fm.addButton("假人与玩家同步", "", (pl)=>{ FpGuiForms.sendSyncForm(pl); });
        fm.addButton("返回上一级", "", (pl) => { FpGuiForms.sendMainMenu(pl); });

        fm.send(player);
    }

    // fakeplayer do/clear operation
    static sendDoClearOpMenu(player)
    {
        let fpsList = [];
        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "operation", fpName))
                fpsList.push(fpName);
        });
        if(fpsList.length == 0)
        {
            FpGuiForms.sendErrorForm(pl, "你尚未拥有可以执行此操作的假人",
                    (pl) => { FpGuiForms.sendOperationMenu(pl); });
        }
        let opsArr = _LONG_OPERATIONS_LIST.concat(_SHORT_OPERATIONS_LIST);

        let fm = new BetterCustomForm("LLSE-FakePlayer 执行/清除假人操作");
        fm.addLabel("label1", "§e选择操作并填写参数：§r\n");

        fm.addDropdown("fpName", "假人：", fpsList);
        fm.addDropdown("operation", "执行操作：", opsArr);
        fm.addInput("interval", "操作间隔时间(毫秒):", "1000");
        fm.addInput("maxTimes", "操作上限次数:", "3");
        fm.addInput("length", "操作时长(毫秒):", "500");
        fm.addLabel("label2", '提示：像"attack"和"interact"之类的短操作不需要"操作时长"参数。留空即可。');

        fm.setCancelCallback((pl)=>{ FpGuiForms.sendOperationMenu(pl); });
        fm.setSubmitCallback((pl, resultObj)=>
        {
            let result = null;
            let operation = opsArr[resultObj.get("operation")];
            let fpName = fpsList[resultObj.get("fpName")];
            
            if(operation == "clear")
            {
                result = FakePlayerManager.clearOperation(fpName);
                FpGuiForms.sendSuccessMsg(pl, `§6${fpName}§r操作已清除`);
                return;
            }

            // transform & check param format
            let lengthStr = resultObj.get("length");
            let length = Number(lengthStr);
            if(_LONG_OPERATIONS_LIST.includes(operation) && (lengthStr.length == 0 || isNaN(length) || !IsNumberInt(length)))
            {
                FpGuiForms.sendErrorForm(pl, `"length"参数格式错误： ${resultObj.get("length")}`, 
                    (pl)=>{ FpGuiForms.sendDoClearOpMenu(pl); });
                return;
            }

            let intervalStr = resultObj.get("interval");
            let interval = Number(intervalStr);
            if(intervalStr.length == 0 || isNaN(interval) || !IsNumberInt(interval))
            {
                FpGuiForms.sendErrorForm(pl, `"interval参数格式错误": ${resultObj.get("interval")}`, 
                    (pl)=>{ FpGuiForms.sendDoClearOpMenu(pl); });
                return;
            }

            let maxTimesStr = resultObj.get("maxTimes");
            let maxTimes = Number(maxTimesStr);
            if(maxTimesStr.length == 0 || isNaN(maxTimes) || !IsNumberInt(maxTimes))
            {
                FpGuiForms.sendErrorForm(pl, `"maxTimes"参数格式错误: ${resultObj.get("maxTimes")}`, 
                    (pl)=>{ FpGuiForms.sendDoClearOpMenu(pl); });
                return;
            }

            result = FakePlayerManager.setOperation(fpName, operation, interval, maxTimes, length);
            if(result == SUCCESS)
                FpGuiForms.sendSuccessMsg(pl, `§6${fpName}§r已设置为执行：${operation}.`);
            else
                FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendDoClearOpMenu(pl); });
        });
        fm.send(player);
    }

    // fakeplayer walk to position
    static sendWalkToPosForm(player)
    {
        let fpsList = [];
        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "walkto", fpName))
                fpsList.push(fpName);
        });
        if(fpsList.length == 0)
        {
            FpGuiForms.sendErrorForm(pl, "你尚未拥有可以执行此操作的假人",
                    (pl) => { FpGuiForms.sendOperationMenu(pl); });
        }

        let fm = new BetterCustomForm("LLSE-FakePlayer 假人行走");
        fm.addLabel("label1", "§e选择目标位置：§r\n");

        fm.addDropdown("fpName", "假人：", fpsList);
        fm.addInput("position", "目标坐标：(x y z)", "315 70 233");
        fm.addDropdown("dimid", "目标维度：", _VALID_DIMENSION_NAMES, player.pos.dimid);
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendOperationMenu(pl); });
        fm.setSubmitCallback((pl, resultObj)=>{
            let fpName = fpsList[resultObj.get("fpName")];
            let posObj = ParsePositionString(resultObj.get("position"));
            let dimid = resultObj.get("dimid");
            if(!posObj)
            {
                FpGuiForms.sendErrorForm(pl, `"position"参数格式错误：${resultObj.get("position")}`, 
                    (pl)=>{ FpGuiForms.sendWalkToPosForm(pl); });
                return;
            }

            let result = "";
            let data = null;
            // logger.debug(targetPos);
            let targetPos = new FloatPos(eval(posObj.x), eval(posObj.y), eval(posObj.z), dimid);
            [result, data] = FakePlayerManager.walkToPos(fpName, targetPos);
            if(result != SUCCESS)
            {
                FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendWalkToPosForm(pl); });
                return;
            }
            let resStr = "";
            if(data.isFullPath || data.path.length == 0)
                resStr = `目标已设置。${fpName}正在走向目标${targetPos.toString()}...`;
            else
            {
                let fpPos = FakePlayerManager.getPosition(fpName)[1];
                let dimid = fpPos ? fpPos.dimid : pl.pos.dimid;        // if cannot get dimid, guess that is pl's dimid

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                resStr = `无法到达设定目标。路径将在${lastPathPoint.toString()}终止。`
                    +` ${fpName}正在走向路径终点...`;
            }
            FpGuiForms.sendSuccessMsg(pl, resStr);
        });
        fm.send(player);
    }

    // fakeplayer walk to another player
    static sendWalkToPlayerForm(player)
    {
        let fpsList = [];
        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "walkto", fpName))
                fpsList.push(fpName);
        });
        if(fpsList.length == 0)
        {
            FpGuiForms.sendErrorForm(pl, "你尚未拥有可以执行此操作的假人",
                    (pl) => { FpGuiForms.sendOperationMenu(pl); });
        }

        let fm = new BetterCustomForm("LLSE-FakePlayer 假人行走");
        fm.addLabel("label1", "§e选择目标：§r\n");

        let plsList = mc.getOnlinePlayers();
        let plNamesList = [];
        let currentPlIndex = 0;
        for(let i = 0; i<plsList.length; ++i)
        {
            plNamesList.push(plsList[i].name);
            if(plsList[i].name == player.name)
                currentPlIndex = i;
        }
        fm.addDropdown("fpName", "假人：", fpsList);
        fm.addDropdown("plName", "目标玩家：", plNamesList, currentPlIndex);
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendOperationMenu(pl); });
        fm.setSubmitCallback((pl, resultObj)=>{
            let fpName = fpsList[resultObj.get("fpName")];
            let plName = plNamesList[resultObj.get("plName")];
            let targetPlayer = mc.getPlayer(plName);
            if(!targetPlayer)
            {
                FpGuiForms.sendErrorForm(pl, `玩家${plName}不存在`, (pl)=>{ FpGuiForms.sendWalkToPlayerForm(pl); });
                return;
            }

            let result = "";
            let data = null;
            [result, data] = FakePlayerManager.walkToEntity(fpName, targetPlayer);
            if(result != SUCCESS)
            {
                FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendWalkToPlayerForm(pl); });
                return;
            }
            let resStr = "";
            if(data.isFullPath || data.path.length == 0)
                resStr = `目标已设置。${fpName}正在走向${plName}.`;
            else
            {
                let fpPos = FakePlayerManager.getPosition(fpName)[1];
                let dimid = fpPos ? fpPos.dimid : targetPlayer.pos.dimid;        // if cannot get dimid, guess

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                resStr = `无法到达设定目标。路径将在${lastPathPoint.toString()}终止。`
                    +` ${fpName}正在走向路径终点...`;
            }
            FpGuiForms.sendSuccessMsg(pl, resStr);
        });
        fm.send(player);
    }

    // fakeplayer tp to position
    static sendTpToPosForm(player)
    {
        let fpsList = [];
        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "tp", fpName))
                fpsList.push(fpName);
        });
        if(fpsList.length == 0)
        {
            FpGuiForms.sendErrorForm(pl, "你尚未拥有可以执行此操作的假人",
                    (pl) => { FpGuiForms.sendOperationMenu(pl); });
        }

        let fm = new BetterCustomForm("LLSE-FakePlayer 假人传送");
        fm.addLabel("label1", "§e选择目标位置：§r\n");

        fm.addDropdown("fpName", "假人：", fpsList);
        fm.addInput("position", "目标坐标： (x y z)", "315 70 233");
        fm.addDropdown("dimid", "目标维度：", _VALID_DIMENSION_NAMES, player.pos.dimid);
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendOperationMenu(pl); });
        fm.setSubmitCallback((pl, resultObj)=>{
            let fpName = fpsList[resultObj.get("fpName")];
            let posObj = ParsePositionString(resultObj.get("position"));
            let dimid = resultObj.get("dimid");
            if(!posObj)
            {
                FpGuiForms.sendErrorForm(pl, `"position"参数格式错误: ${resultObj.get("position")}`, 
                    (pl)=>{ FpGuiForms.sendWalkToPosForm(pl); });
                return;
            }

            let targetPos = new FloatPos(eval(posObj.x), eval(posObj.y), eval(posObj.z), dimid);
            let result = FakePlayerManager.teleportToPos(fpName, targetPos);
            if(result != SUCCESS)
                FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendTpToPosForm(pl); });
            else
                FpGuiForms.sendSuccessMsg(pl, `§6${fpName}§r已被传送到${targetPos.toString()}`);
        });
        fm.send(player);
    }

    // fakeplayer tp to another player
    static sendTpToPlayerForm(player)
    {
        let fpsList = [];
        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "tp", fpName))
                fpsList.push(fpName);
        });
        if(fpsList.length == 0)
        {
            FpGuiForms.sendErrorForm(pl, "你尚未拥有可以执行此操作的假人",
                    (pl) => { FpGuiForms.sendOperationMenu(pl); });
        }

        let fm = new BetterCustomForm("LLSE-FakePlayer 假人传送");
        fm.addLabel("label1", "§e选择目标：§r\n");

        let plsList = mc.getOnlinePlayers();
        let plNamesList = [];
        let currentPlIndex = 0;
        for(let i = 0; i<plsList.length; ++i)
        {
            plNamesList.push(plsList[i].name);
            if(plsList[i].name == player.name)
                currentPlIndex = i;
        }
        fm.addDropdown("fpName", "假人：", fpsList);
        fm.addDropdown("plName", "目标玩家：", plNamesList, currentPlIndex);
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendOperationMenu(pl); });
        fm.setSubmitCallback((pl, resultObj)=>{
            let fpName = fpsList[resultObj.get("fpName")];
            let plName = plNamesList[resultObj.get("plName")];
            let targetPlayer = mc.getPlayer(plName);
            if(!targetPlayer)
            {
                FpGuiForms.sendErrorForm(pl, `玩家${plName}不存在`, (pl)=>{ FpGuiForms.sendTpToPlayerForm(pl); });
                return;
            }

            let result = FakePlayerManager.teleportToEntity(fpName, targetPlayer);
            if(result != SUCCESS)
                FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendTpToPlayerForm(pl); });
            else
                FpGuiForms.sendSuccessMsg(pl, `§6${fpName}§r已被传送到${plName}`);
        });
        fm.send(player);
    }

    // fakeplayer sync with another player
    static sendSyncForm(player)
    {
        let fpsList = [];
        FakePlayerManager.forEachFp((fpName, fp) => {
            if(PermManager.hasPermission(player, "sync", fpName))
                fpsList.push(fpName);
        });
        if(fpsList.length == 0)
        {
            FpGuiForms.sendErrorForm(pl, "你尚未拥有可以执行此操作的假人",
                    (pl) => { FpGuiForms.sendOperationMenu(pl); });
        }

        let fm = new BetterCustomForm("LLSE-FakePlayer 假人玩家同步");
        fm.addLabel("label1", "§e选择目标玩家：§r\n");

        let plsList = mc.getOnlinePlayers();
        let plNamesList = [];
        let currentPlIndex = 0;
        for(let i = 0; i<plsList.length; ++i)
        {
            plNamesList.push(plsList[i].name);
            if(plsList[i].name == player.name)
                currentPlIndex = i;
        }
        fm.addDropdown("fpName", "假人：", fpsList);
        fm.addSwitch("isStart", "同步开关：", false);
        fm.addDropdown("plName", "目标玩家：", plNamesList, currentPlIndex);
        
        fm.setCancelCallback((pl)=>{ FpGuiForms.sendOperationMenu(pl); });
        fm.setSubmitCallback((pl, resultObj)=>{
            let fpName = fpsList[resultObj.get("fpName")];
            let plName = plNamesList[resultObj.get("plName")];
            let targetPlayer = mc.getPlayer(plName);
            if(!targetPlayer)
            {
                FpGuiForms.sendErrorForm(pl, `玩家${plName}不存在`, (pl)=>{ FpGuiForms.sendSyncForm(pl); });
                return;
            }
            let isStart = resultObj.get("isStart");

            let result = null;
            if(isStart)
                result = FakePlayerManager.startSync(fpName, targetPlayer);
            else
                result = FakePlayerManager.stopSync(fpName);
            if(result != SUCCESS)
                FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendSyncForm(pl); });
            else
            {
                if(isStart)
                    FpGuiForms.sendSuccessMsg(pl, `§6${fpName}§r的玩家同步已开始。使用命令"/fpc sync stop"停止同步。`);
                else
                    FpGuiForms.sendSuccessMsg(pl, `§6${fpName}§r的玩家同步已停止。`);
            }
        });
        fm.send(player);
    }

    // fakeplayer inventory menu
    static sendInventoryMenu(player, fpName)
    {
        let fm = new BetterSimpleForm("LLSE-FakePlayer 假人物品栏操作");

        let atLeastOneItem = false;
        if(PermManager.hasPermission(player, "getinventory", fpName))
        {
            atLeastOneItem = true;
            // getInventory
            fm.addButton("获取假人背包信息", "", (pl)=>{ 
                let result = "";
                let data = null;
                [result, data] = FakePlayerManager.getInventory(fpName);
                if(result != SUCCESS)
                {
                    FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendInventoryMenu(pl, fpName); });
                    return;
                }
                let resStr = `§6${fpName}§r的背包信息：\n`;

                // hand
                let item = data.Hand;
                if(item)
                    resStr += `§3[主手]§r §6${item.name}§2[${item.count}]§r\n`;
                else
                    resStr += `§3[主手]§r 空\n`;
                
                // offhand
                item = data.OffHand;
                if(item)
                    resStr += `§3[副手]§r §6${item.name}§2[${item.count}]§r\n`;
                else
                    resStr += `§3[副手]§r 空\n`;
                
                // inventory
                let inventoryStr = "";
                for(let i=0; i<data.Inventory.length; ++i)
                {
                    let item = data.Inventory[i];
                    if(item)
                    {
                        inventoryStr += `${i}: §6${item.name}§2[${item.count}]§r  `;
                    }
                }
                if(inventoryStr == "")
                    resStr += "§3[物品栏]§r 空\n";
                else
                    resStr += "§3[物品栏]§r\n" + inventoryStr + "\n";
                
                // armor
                let armorStr = "";
                for(let i=0; i<data.Armor.length; ++i)
                {
                    let item = data.Armor[i];
                    if(item)
                    {
                        armorStr += `${i}: §6${item.name}§2[${item.count}]§r  `;
                    }
                }
                if(armorStr == "")
                    resStr += "§3[盔甲栏]§r 空\n";
                else
                    resStr += "§3[盔甲栏]§r\n" + armorStr + "\n";
                
                FpGuiForms.sendInfoForm(pl, resStr, (pl) => { FpGuiForms.sendInventoryMenu(pl, fpName); });
            });
        }
        if(PermManager.hasPermission(player, "give", fpName))
        {
            atLeastOneItem = true;
            fm.addButton("将手中物品给予假人", "", (pl)=>{
                FpGuiForms.sendAskForm(pl, `是否把你主手中的物品给予假人§6${fpName}§r？`, 
                    (pl) =>
                    {
                        let result = FakePlayerManager.giveItem(fpName, pl);
                        if(result != SUCCESS)
                            FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendInventoryMenu(pl, fpName); });
                        else
                            FpGuiForms.sendSuccessForm(pl, `物品已给予§6${fpName}§r`, (pl) => { FpGuiForms.sendInventoryMenu(pl, fpName); });
                    },
                    (pl) => { FpGuiForms.sendFpInfoForm(pl, fpName); });
            });
        }
        if(PermManager.hasPermission(player, "drop", fpName))
        {
            atLeastOneItem = true;
            fm.addButton("假人丢出手中物品", "", (pl)=>{
                FpGuiForms.sendAskForm(pl, `是否让假人§6${fpName}§r丢出主手中的物品？`, 
                    (pl) =>
                    {
                        let result = FakePlayerManager.dropItem(fpName, _DEFAULT_PLAYER_SELECT_SLOT);
                        if(result != SUCCESS)
                            FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendInventoryMenu(pl, fpName); });
                        else
                            FpGuiForms.sendSuccessForm(pl, `§6${fpName}§r已丢出主手物品`, 
                                (pl) => { FpGuiForms.sendInventoryMenu(pl, fpName); });
                    },
                    (pl) => { FpGuiForms.sendFpInfoForm(pl, fpName); });
            });
        }
        if(PermManager.hasPermission(player, "dropall", fpName))
        {
            atLeastOneItem = true;
            fm.addButton("假人丢出背包所有物品", "", (pl)=>{ 
                FpGuiForms.sendAskForm(pl, `是否让假人§6${fpName}§r丢出背包中所有物品？`, 
                    (pl) =>
                    {
                        let result = FakePlayerManager.dropAllItems(fpName);
                        if(result != SUCCESS)
                            FpGuiForms.sendErrorForm(pl, result, (pl)=>{ FpGuiForms.sendInventoryMenu(pl, fpName); });
                        else
                            FpGuiForms.sendSuccessForm(pl, `§6${fpName}§r已丢出所有物品`, 
                                (pl) => { FpGuiForms.sendInventoryMenu(pl, fpName); });
                    },
                    (pl) => { FpGuiForms.sendFpInfoForm(pl, fpName); });
            });
        }
        fm.addButton("返回上一级", "", (pl) => { FpGuiForms.sendFpInfoForm(pl, fpName); });

        if(atLeastOneItem)
            fm.setContent(`§e为假人§6${fpName}§e选择物品栏操作：§r`);
        else
            fm.setContent("§e抱歉，你无权执行此操作。§r");
        fm.send(player);
    }
}