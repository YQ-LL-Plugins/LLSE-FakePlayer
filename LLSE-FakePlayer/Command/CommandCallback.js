import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";
import { FpGuiForms } from "../Gui/GuiForm.js";
import { PermManager } from "../Utils/PermManager.js";
import { CalcPosFromViewDirection, IsValidDimId, EntityGetFeetPos } from "../Utils/Utils.js";
import { GlobalConf } from "../Utils/ConfigFileHelper.js";
import { SUCCESS } from "../Utils/GlobalVars.js";

export function CmdCallback(_cmd, ori, out, res)
{
    let permRes = PermManager.checkOriginPermission(ori, res.action);
    if(permRes != SUCCESS)
    {
        out.error("[FakePlayer] " + permRes);
        return;
    }

    // logger.debug("OriginType: ", ori.type);
    let isExecutedByPlayer = (ori.player == null);
    let result;
    switch(res.action)
    {
    case "online":
        result = FakePlayerManager.online(res.fpname);
        if (result == SUCCESS)
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.online", res.fpname));
        else
            out.error("[FakePlayer] " + result);
        break;
    case "offline":
        result = FakePlayerManager.offline(res.fpname);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.offline", res.fpname));
        else
            out.error("[FakePlayer] " + result)
        break;
    case "onlineall":
        {
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
            else if(ori.player)
                spawnPos.dimid = ori.player.pos.dimid;
            else
            {
                out.error(`[FakePlayer] ` + i18n.tr("command.resultText.create.fail.needValidDimId"));
                break;
            }
        }
        else if(ori.player)
        {
            // createpos not set, but executed by player
            spawnPos = CalcPosFromViewDirection(EntityGetFeetPos(ori.player), ori.player.direction, 1);
        }
        else
        {
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.create.fail.needValidPosition"));
            break;
        }

        // create
        // logger.debug("SpawnPos: ", spawnPos.toString());
        result = FakePlayerManager.createNew(fpName, spawnPos.x, spawnPos.y, spawnPos.z, spawnPos.dimid);
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
        if(ori.player)
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

                    out.success(`[FakePlayer] §6${fpName}§r:\n` + i18n.tr("command.resultText.list.specificInfo", 
                        posObj.toString(), operationStr, syncStatusStr, statusStr));
                }
            }
        }
        break;
    case "operation":
        if(res.optype)
        {
            // short op type
            if(res.optype == "clear")
                result = FakePlayerManager.clearOperation(res.fpname);
            else
                result = FakePlayerManager.setOperation(res.fpname, res.optype, res.interval, res.maxtimes);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            if(res.optype == "clear")
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.operation.clear", res.fpname));
            else
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.operation.setTo", res.fpname, res.optype));
        }
        else
        {
            // long op type
            result = FakePlayerManager.setOperation(res.fpname, res.longoptype, res.interval, res.maxtimes, res.length);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.operation.setTo", res.fpname, res.longoptype));
        }
        break;
    case "walkto":
        // logger.debug(res.player);
        if((res.player instanceof Array) && res.player != [])
        {
            let target = res.player[0];
            let data = null;
            [result, data] = FakePlayerManager.walkToEntity(res.fpname, target);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(data.isFullPath || data.path.length == 0)
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.targetSet", target.name));
            else
            {
                let fpPos = FakePlayerManager.getPosition(res.fpname)[1];
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
            [result, data] = FakePlayerManager.walkToPos(res.fpname, res.targetpos);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(data.isFullPath || data.path.length == 0)
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.targetSet", res.targetpos));
            else
            {
                let fpPos = FakePlayerManager.getPosition(res.fpname)[1];
                let dimid = fpPos ? fpPos.dimid : 0;        // if cannot get dimid, guess that is 0

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.cannotReach", lastPathPoint.toString()));
            }
        }
        else
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.invalidTarget"))
        break;
    case "tp":
        // logger.debug(res.player);
        if((res.player instanceof Array) && res.player != [])
        {
            let target = res.player[0];
            result = FakePlayerManager.teleportToEntity(res.fpname, target);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.tp.success", res.fpname, target.name));
        }
        else if (res.targetpos)
        {
            result = FakePlayerManager.teleportToPos(res.fpname, res.targetpos);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] `+ i18n.tr("command.resultText.tp.success", res.fpname, res.targetpos));
        }
        else
            out.error(`[FakePlayer] ` + i18n.tr("command.resultText.walkto.invalidTarget"))
        break;
    
    case "give":
        if(!ori.player)
            out.error("[FakePlayer] " + i18n.tr("command.resultText.give.invalidSource"));
        else
        {
            result = FakePlayerManager.giveItem(res.fpname, ori.player);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] ` + i18n.tr("command.resultText.give.success", res.fpname));
        }
        break;
    case "getinventory":
        {
            let data = null;
            [result, data] = FakePlayerManager.getInventory(res.fpname);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            let resStr = `[FakePlayer] ` + i18n.tr("command.resultText.inventory.title", res.fpname) + "\n";

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
        result = FakePlayerManager.dropItem(res.fpname, res.slotid2);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.drop.success", res.fpname));
        break;
    case "dropall":
        result = FakePlayerManager.dropAllItems(res.fpname);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.dropAll.success", res.fpname));
        break;
    case "setselect":
        result = FakePlayerManager.setSelectSlot(res.fpname, res.slotid);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] ` + i18n.tr("command.resultText.setselect.success"));
        break;
    case "sync":
        if(!ori.player)
            out.error("[FakePlayer] " + i18n.tr("command.resultText.give.invalidSource"));
        else
        {
            if(res.synctype == "start")
                result = FakePlayerManager.startSync(res.fpname, ori.player);
            else if (res.synctype == "stop")
                result = FakePlayerManager.stopSync(res.fpname);
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
                out.success("[FakePlayer] " + i18n.tr("command.resultText.sync.start", res.fpname));
            else
                out.success("[FakePlayer] " + i18n.tr("command.resultText.sync.stop", res.fpname));
        }
        break;
    
    case "perm":
    {
        let executor = ori.player ? ori.player : PermManager.CONSOLE;
        let fpName = res.fpname;

        if(res.permtype == "add")
        {
            let action = res.actionenum;
            let plName = res.plname;
            if(PermManager.hasPermission(executor, "perm", fpName))
            {
                result = PermManager.addCertainPerm(executor, fpName, plName, action);
                if(result == SUCCESS)
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.perm.add", action, plName));
                else
                    out.error("[FakePlayer] " + result);
            }
            else
                out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
        }
        else if(res.permtype == "remove")
        {
            let action = res.actionenum;
            let plName = res.plname;
            if(PermManager.hasPermission(executor, "perm", fpName))
            {
                result = PermManager.removeCertainPerm(executor, fpName, plName, action);
                if(result == SUCCESS)
                    out.success("[FakePlayer] " + i18n.tr("command.resultText.perm.remove", plName, action));
                else
                    out.error("[FakePlayer] " + result);
            }
            else
                out.error("[FakePlayer] " + i18n.tr("permManager.error.noAccess"));
        }
        else if(res.permlisttype = "list")
        {
            //TODO:finish 
            out.success("perm <fpname> list");
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
                        i18n.tr("command.resultText.remove.ask", fpName, plName),
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
        if(ori.player)
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
            //TODO:finish 
            out.success("settings listsu");
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
        out.success(`[FakePlayer] Target file: ${res.filepath}. Function not finished.`);
        break;
    case "help":
        result = FakePlayerManager.getHelp()[1];
        out.success(result);
        break;
    case "gui":
        if(!ori.player)
            out.error("[FakePlayer] Only players can use gui command");
        else
            FpGuiForms.sendMainMenu(ori.player);
        break;
    
    default:
        out.error(`[FakePlayer] Unknown action: ${res.action}`);
    }
}