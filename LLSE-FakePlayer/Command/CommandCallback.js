import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";
import { FpGuiForms } from "../Gui/GuiForm.js";
import { PermManager } from "../Utils/PermManager.js";
import { CalcPosFromViewDirection, IsValidDimId, EntityGetFeetPos } from "../Utils/Utils.js";
import { GlobalConf } from "../Utils/ConfigFileHelper.js";
import { SUCCESS } from "../Utils/GlobalVars.js";

export function CmdCallback(_cmd, ori, out, res)
{
    // logger.debug("OriginType: ", ori.type);
    let isExecutedByPlayer = (ori.player != null);
    let isExecutedByConsole = (ori.type == 7);          // 7 is BDS console
    if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
    {
        out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
        return;
    }

    let result;
    let action = res.action;
    switch(action)
    {
    case "online":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }
        result = FakePlayerManager.online(fpName);
        if (result == SUCCESS)
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.online", fpName));
        else
            out.error("[FakePlayer] " + result);
        break;
    }
    case "offline":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }
        result = FakePlayerManager.offline(fpName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.offline", fpName));
        else
            out.error("[FakePlayer] " + result)
        break;
    }
    case "onlineall":
    {
        if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }

        let successNames = [];
        [result, successNames] = FakePlayerManager.onlineAll(isExecutedByPlayer ? ori.player : PermManager.CONSOLE);

        let namesList = "";
        for(let name of successNames)
            namesList += `§6${name}§r, `;
        namesList = namesList.substring(0, namesList.length - 2);
        if(result == SUCCESS)
            out.success("[FakePlayer] " + i18n.tr("command.resultText.onlineAll.allSuccess") 
                + "\n" + namesList);
        else
            out.error("[FakePlayer] " + i18n.tr("command.resultText.onlineAll.partlySuccess", result)
                + "\n" + namesList)
        break;
    }
    case "offlineall":
    {
        if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }
        
        let successNames = [];
        [result, successNames] = FakePlayerManager.offlineAll(isExecutedByPlayer ? ori.player : PermManager.CONSOLE);

        let namesList = "";
        for(let name of successNames)
            namesList += `§6${name}§r, `;
        namesList = namesList.substring(0, namesList.length - 2);
        if(result == SUCCESS)
            out.success("[FakePlayer] " + i18n.tr("command.resultText.offlineAll.allSuccess") 
                + "\n" + namesList);
        else
            out.error("[FakePlayer] " + i18n.tr("command.resultText.offlineAll.partlySuccess", result)
                + "\n" + namesList)
        break;
    }

    case "create":
    {
        if(isExecutedByPlayer && !PermManager.checkPermToCreateNewFp(ori.player))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }

        let fpName = res.fpnewname;
        let spawnPos = new FloatPos(0, 32767, 0, 0);
        // if createpos is set
        if(res.createpos)
        {
            spawnPos.x = res.createpos.x;
            spawnPos.y = res.createpos.y;
            spawnPos.z = res.createpos.z;

            let dimid = res.createdimid;
            if(dimid)
            {
                // createdimid is set
                if(!IsValidDimId(dimid))
                {
                    out.error(`[FakePlayer] ` + i18n.tr("command.resultText.create.fail.notValidDimId", dimid));
                    break;
                }
                spawnPos.dimid = dimid;
            }
            else if(isExecutedByPlayer)
                spawnPos.dimid = ori.player.pos.dimid;
            else
            {
                out.error(`[FakePlayer] ` + i18n.tr("command.resultText.create.fail.needValidDimId"));
                break;
            }
        }
        else if(isExecutedByPlayer)
        {
            // createpos not set, but executed by player
            spawnPos = CalcPosFromViewDirection(EntityGetFeetPos(ori.player), ori.player.direction, 1);
        }
        else
        {
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.create.fail.needValidPosition"));
            break;
        }

        let ownerName;
        if(isExecutedByConsole)
        {
            ownerName = res.ownername;
            if(!ownerName)
            {
                out.error(`[FakePlayer] ` + i18n.tr("command.resultText.create.fail.needValidOwner"));
                break;
            }
        }
        else
        {
            ownerName = res.ownername;
            if(!ownerName)
            {
                // In default, creator is owner
                ownerName = ori.player.realName;
            }
        }

        // create
        // logger.debug("SpawnPos: ", spawnPos.toString());
        let executor = isExecutedByPlayer ? ori.player : PermManager.CONSOLE;
        result = FakePlayerManager.createNew(fpName, spawnPos.x, spawnPos.y, spawnPos.z, spawnPos.dimid, ownerName, executor);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }
        // online
        result = FakePlayerManager.online(fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.create.success", fpName));
        break;
    }
    case "remove":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        if(isExecutedByPlayer)
        {
            // send confirm dialog
            FpGuiForms.sendAskForm(ori.player, 
                i18n.tr("command.resultText.remove.ask", fpName),
                (pl)=>
            {
                let removeResult = FakePlayerManager.remove(fpName);
                if(removeResult != SUCCESS)
                    pl.tell("[FakePlayer] " + removeResult);
                else
                    pl.tell(`[FakePlayer] ` + i18n.tr("command.resultText.remove.success", fpName));
            }, (pl)=>
            {
                pl.tell("[FakePlayer] " + i18n.tr("command.resultText.action.cancelled"));
            });
        }
        else
        {
            result = FakePlayerManager.remove(fpName);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.remove.success", fpName));
        }
        break;
    }
    case "list":
    {
        if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }

        let fpName = res.fpname2;
        if(!fpName)
        {
            // get namelist of all fps
            result = FakePlayerManager.list()[1];
            let namesStr = "";
            for(let name of result)
            {
                let isOnline = FakePlayerManager.isOnline(name)[1];
                if(isOnline)
                    namesStr += "§6" + name + "§r, ";
                else
                    namesStr += name + ", ";
            }
            if(namesStr.length > 0)
            {
                namesStr = namesStr.substring(0, namesStr.length - 2);
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.list.has", result.length) + `\n${namesStr}`);
            }
            else
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.list.none"));
        }
        else
        {
            // get info of a specific fp
            let resultData = FakePlayerManager.getAllInfo(fpName);
            if(resultData[0] != SUCCESS)
                out.error(`[FakePlayer] ` + resData[0]);
            else
            {
                let result = resultData[1];
                let posObj = new FloatPos(eval(result.pos.x), eval(result.pos.y), eval(result.pos.z), eval(result.pos.dimid));
                let syncPlayerName = data.xuid2name(result.syncXuid);

                let operationStr = result.operation ? result.operation : i18n.tr("command.resultText.list.specificInfo.none");
                let syncStatusStr = syncPlayerName ? syncPlayerName : i18n.tr("command.resultText.list.specificInfo.none");
                let statusStr = result.isOnline ? i18n.tr("command.resultText.list.specificInfo.online")
                    : i18n.tr("command.resultText.list.specificInfo.offline");
                let ownerName = result.ownerName ? result.ownerName : i18n.tr("command.resultText.list.specificInfo.none");

                out.success(`[FakePlayer] §6${fpName}§r:\n` + i18n.tr("command.resultText.list.specificInfo.model", 
                    posObj.toString(), operationStr, syncStatusStr, statusStr, ownerName));

                if(!result.ownerName)
                {
                    if(isExecutedByPlayer)
                        ori.player.tell("[FakePlayer] " + i18n.tr("permManager.warning.fpNoOwner", fpName));
                    else
                        logger.warn("Warn: " + i18n.tr("permManager.warning.fpNoOwner", fpName));
                }
            }
        }
        break;
    }

    case "operation":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        if(res.optype)
        {
            // short op type
            if(res.optype == "clear")
                result = FakePlayerManager.clearOperation(fpName);
            else
                result = FakePlayerManager.setOperation(fpName, res.optype, res.interval, res.maxtimes);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            if(res.optype == "clear")
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.operation.clear", fpName));
            else
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.operation.setTo", fpName, res.optype));
        }
        else
        {
            // long op type
            result = FakePlayerManager.setOperation(fpName, res.longoptype, res.interval, res.maxtimes, res.length);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.operation.setTo", fpName, res.longoptype));
        }
        break;
    }
    case "walkto":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        // logger.debug(res.player);
        if((res.player instanceof Array) && res.player != [])
        {
            let target = res.player[0];
            let data = null;
            [result, data] = FakePlayerManager.walkToEntity(fpName, target);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(data.isFullPath || data.path.length == 0)
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.targetSet", target.name));
            else
            {
                let fpPos = FakePlayerManager.getPosition(fpName)[1];
                let dimid = fpPos ? fpPos.dimid : target.pos.dimid;

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.cannotReach", lastPathPoint.toString()));
            }
        }
        else if (res.targetpos)
        {
            let data = null;
            // logger.debug(res.targetpos);
            [result, data] = FakePlayerManager.walkToPos(fpName, res.targetpos);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(data.isFullPath || data.path.length == 0)
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.targetSet", res.targetpos));
            else
            {
                let fpPos = FakePlayerManager.getPosition(fpName)[1];
                let dimid = fpPos ? fpPos.dimid : 0;        // if cannot get dimid, guess that is 0

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.cannotReach", lastPathPoint.toString()));
            }
        }
        else
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.invalidTarget"))
        break;
    }
    case "tp":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        // logger.debug(res.player);
        if((res.player instanceof Array) && res.player != [])
        {
            let target = res.player[0];
            result = FakePlayerManager.teleportToEntity(fpName, target);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.tp.success", fpName, target.name));
        }
        else if (res.targetpos)
        {
            result = FakePlayerManager.teleportToPos(fpName, res.targetpos);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] `+ i18n.tr("command.resultText.tp.success", fpName, res.targetpos));
        }
        else
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.invalidTarget"))
        break;
    }
    
    case "give":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        if(!isExecutedByPlayer)
            out.error("[FakePlayer] " + i18n.tr("command.resultText.give.invalidSource"));
        else
        {
            result = FakePlayerManager.giveItem(fpName, ori.player);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.give.success", fpName));
        }
        break;
    }
    case "getinventory":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        let data = null;
        [result, data] = FakePlayerManager.getInventory(fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }
        let resStr = `[FakePlayer] ` + i18n.tr("command.resultText.inventory.title", fpName) + "\n";

        // hand
        let item = data.Hand;
        if(item)
            resStr += i18n.tr("command.resultText.inventory.mainHand.item", item.name, item.cout) + "\n";
        else
            resStr += i18n.tr("command.resultText.inventory.mainHand.empty") + "\n";
        
        // offhand
        item = data.OffHand;
        if(item)
            resStr += i18n.tr("command.resultText.inventory.offHand.item", item.name, item.cout) + "\n";
        else
            resStr += i18n.tr("command.resultText.inventory.offHand.empty") + "\n";
        
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
            resStr += i18n.tr("command.resultText.inventory.inventory.empty") + "\n";
        else
            resStr += i18n.tr("command.resultText.inventory.inventory.prefix") + "\n" + inventoryStr + "\n";
        
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
            resStr += i18n.tr("command.resultText.inventory.armor.empty") + "\n";
        else
            resStr += i18n.tr("command.resultText.inventory.armor.prefix") + "\n" + armorStr + "\n";
        
        out.success(resStr);
        break;
    }
    case "drop":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        result = FakePlayerManager.dropItem(fpName, res.slotid2);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.drop.success", fpName));
        break;
    }
    case "dropall":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        result = FakePlayerManager.dropAllItems(fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.dropAll.success", fpName));
        break;
    }
    case "setselect":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        result = FakePlayerManager.setSelectSlot(fpName, res.slotid);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.setselect.success"));
        break;
    }
    case "sync":
    {
        let fpName = res.fpname;
        result = PermManager.checkOriginPermission(ori, action, fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        if(!isExecutedByPlayer)
            out.error("[FakePlayer] " + i18n.tr("command.resultText.give.invalidSource"));
        else
        {
            if(res.synctype == "start")
                result = FakePlayerManager.startSync(fpName, ori.player);
            else if (res.synctype == "stop")
                result = FakePlayerManager.stopSync(fpName);
            else
            {
                out.error(`[FakePlayer] ` + i18n.tr("command.resultText.sync.unknownAction", res.synctype));
                break;
            }

            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(res.synctype == "start")
                out.success("[FakePlayer] " + i18n.tr("command.resultText.sync.start", fpName));
            else
                out.success("[FakePlayer] " + i18n.tr("command.resultText.sync.stop", fpName));
        }
        break;
    }
    
    case "perm":
    {
        let executor = isExecutedByPlayer ? ori.player : PermManager.CONSOLE;
        let fpName = res.fpname;

        if(res.permtype == "add")
        {
            let subAction = res.actionenum;
            let plName = res.plname;
            if(PermManager.hasPermission(executor, "perm", fpName))
            {
                result = PermManager.addCertainPerm(executor, fpName, plName, subAction);
                if(result == SUCCESS)
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.perm.add", subAction, plName));
                else
                    out.error("[FakePlayer] " + result);
            }
            else
                out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
        }
        else if(res.permtype == "remove")
        {
            let subAction = res.actionenum;
            let plName = res.plname;
            if(PermManager.hasPermission(executor, "perm", fpName))
            {
                result = PermManager.removeCertainPerm(executor, fpName, plName, subAction);
                if(result == SUCCESS)
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.perm.remove", plName, subAction));
                else
                    out.error("[FakePlayer] " + result);
            }
            else
                out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
        }
        else if(res.permlisttype == "list")
        {
            let permData = PermManager.getFpPermData(fpName);
            let resultText = i18n.tr("command.resultText.perm.list.title", fpName) + "\n";
            let ownerName = permData.Owner;
            if(!ownerName || ownerName.length == 0)
            {
                ownerName = i18n.tr("command.resultText.list.specificInfo.none");
                if(isExecutedByPlayer)
                    ori.player.tell("[FakePlayer] " + i18n.tr("permManager.warning.fpNoOwner", fpName));
                else
                    logger.warn("Warn: " + i18n.tr("permManager.warning.fpNoOwner", fpName));
            }
            resultText += i18n.tr("command.resultText.perm.list.owner") + ownerName;
            for(let plName in permData.Perms)
            {
                resultText += "\n" + i18n.tr("command.resultText.perm.list.player", plName)
                    + permData.Perms[plName].join(', ');
            }
            out.success("[FakePlayer] " + resultText);
        }
        else if(res.permsetownertype == "setowner")
        {
            let plName = res.plname;
            if(executor != PermManager.CONSOLE)
            {
                // player execute
                if(PermManager.hasPermission(executor, "perm", fpName))
                {
                    // send confirm dialog
                    FpGuiForms.sendAskForm(executor, 
                        i18n.tr("command.resultText.setowner.ask", fpName, plName),
                        (executor)=>
                    {
                        result = PermManager.setOwner(executor, fpName, plName);
                        if(result == SUCCESS)
                            out.success("[FakePlayer] " + i18n.tr("command.resultText.perm.setowner", fpName, plName));
                        else
                            out.error("[FakePlayer] " + result);
                    }, (pl)=>
                    {
                        pl.tell("[FakePlayer] " + i18n.tr("command.resultText.action.cancelled"));
                    });
                }
                else
                    out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            }
            else
            {
                // console execute
                result = PermManager.setOwner(executor, fpName, plName);
                if(result == SUCCESS)
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.perm.setowner", fpName, plName));
                else
                    out.error("[FakePlayer] " + result);
            }
        }
        else
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.sync.unknownAction", res.permtype));
        break;
    }

    case "settings":
    {
        if(isExecutedByPlayer)
        {
            // settings can only execute in console
            out.error("[FakePlayer] " + i18n.tr("permManager.error.onlyConsoleAction"));
            break;
        }

        if(res.settingstype == "setsu")
        {
            let plName = res.plname;
            result = PermManager.addSu(plName);
            if(result == SUCCESS)
                out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.setsu", plName));
            else
                out.error("[FakePlayer] " + result);
        }
        else if(res.settingstype == "removesu")
        {
            let plName = res.plname;
            result = PermManager.removeSu(plName);
            if(result == SUCCESS)
                out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.removesu", plName));
            else
                out.error("[FakePlayer] " + result);
        }
        else if(res.settingstype == "ban")
        {
            let plName = res.plname;
            let isInUserList = PermManager.userList.includes(plName);
            if(PermManager.userMode == "blacklist")
            {
                if(isInUserList)
                {
                    out.error("[FakePlayer] " + i18n.tr("command.resultText.settings.blacklistBanExist", plName));
                }
                else
                {
                    PermManager.addUserToList(plName);
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.blacklistBanned", plName));
                }
            }
            else
            {
                // whitelist mode
                if(isInUserList)
                {
                    PermManager.removeUserFromList(plName);
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.whitelistBanned", plName));
                }
                else
                {
                    out.error("[FakePlayer] " + i18n.tr("command.resultText.settings.whitelistBanNotExist", plName));
                }
            }
        }
        else if(res.settingstype == "allow")
        {
            let plName = res.plname;
            let isInUserList = PermManager.userList.includes(plName);
            if(PermManager.userMode == "blacklist")
            {
                if(isInUserList)
                {
                    PermManager.removeUserFromList(plName);
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.blacklistAllowed", plName));
                }
                else
                {
                    out.error("[FakePlayer] " + i18n.tr("command.resultText.settings.blacklistAllowNotExist", plName));
                }
            }
            else
            {
                // whitelist mode
                if(isInUserList)
                {
                    out.error("[FakePlayer] " + i18n.tr("command.resultText.settings.whitelistAllowExist", plName));
                }
                else
                {
                    PermManager.addUserToList(plName);
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.whitelistAllowed", plName));
                }
            }
        }
        else if(res.listsutype == "listsu")
        {
            let suList = PermManager.getSuList();
            if(suList.length > 0)
            {
                out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.listsu.title") + 
                    "\n" + suList.join(", "));
            }
            else
            {
                out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.listsu.none"));
            }
        }
        else if(res.settingsitems == "maxfpcountlimit")
        {
            let value = res.value;
            if(value < 0)
                out.error("[FakePlayer] " + i18n.tr("command.resultText.settings.maxFpCountLimit.belowZero"));
            else
            {
                GlobalConf.set("MaxFpCountLimitEach", value);
                out.success("[FakePlayer] " + i18n.tr("command.resultText.settings.maxFpCountLimit.set", value));
            }
        }
        else
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.sync.unknownAction", res.settingstype));
        break;
    }

    case "import":
        if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }

        out.success(`[FakePlayer] Target file: ${res.filepath}. Function not finished.`);
        break;
    case "help":
        if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }

        result = FakePlayerManager.getHelp()[1];
        out.success(result);
        break;

    case "gui":
        if(isExecutedByPlayer && !PermManager.isAllowInUserList(ori.player.realName))
        {
            out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
            break;
        }

        if(!isExecutedByPlayer)
            out.error("[FakePlayer] Only players can use gui command");
        else
            FpGuiForms.sendMainMenu(ori.player);
        break;
    
    default:
        out.error(`[FakePlayer] Unknown action: ${action}`);
    }
}