import { SUCCESS, _FP_PERMISSION_DIR } from "../Utils/GlobalVars.js"
import { GlobalConf } from "../Utils/ConfigFileHelper.js"
import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";


// helper
Array.prototype.removeByValue = function (val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === val) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
}


export class PermManager
{
/////////////////////////////////////////////////////////////////////////////////////
///                                 Private Data                                  ///
/////////////////////////////////////////////////////////////////////////////////////

    static ONLY_CONSOLE_ACTIONS = ["settings", "import"];
    static NO_PERM_REQUIRED_ACTIONS = ["help", "list", "onlineall", "offlineall"];
    static SPECIAL_PROCESS_ACTIONS = ["create", "remove"];
    static CONSOLE = "CONSOLE_EXECUTES_COMMAND";

    static suList = [];
    static userList = [];
    static userMode = "blacklist";
    static opIsSu = 1;
    static permConf = null;


/////////////////////////////////////////////////////////////////////////////////////
///                                Help Functions                                 ///
/////////////////////////////////////////////////////////////////////////////////////

    static isWhitelistMode() { return PermManager.userMode == "whitelist"; }

    static initFpPermConfig(fpName, ownerName)
    {
        // {
        //     "Version": 1
        //     "Owner": "yqs112358",
        //     "Perms": { 
        //         "aaa": ["admin"],
        //         "bbb": ["tp", "walkto"],
        //     }
        // }
        let permConf = new JsonConfigFile(_FP_PERMISSION_DIR + `${fpName}.json`);
        permConf.set("Version", 1);
        permConf.set("Owner", ownerName);
        permConf.set("Perms", { ownerName: ["admin"] });
    }

    static getPlayerOwnFpCount(plName)
    {
        let count = 0;
        FakePlayerManager.forEachFp((fpName, fp)=>{
            if(fp.getOwnerName() == plName)
                ++count;
        });
        return count;
    }


/////////////////////////////////////////////////////////////////////////////////////
///                                 Su Functions                                  ///
/////////////////////////////////////////////////////////////////////////////////////

    static addSu(plName)
    {
        logger.debug("addSu: ", plName);
        if(PermManager.suList.includes(plName))
            return i18n.tr("permManager.error.alreadyInSuList", plName);

        PermManager.suList.push(plName);
        GlobalConf.set("SuList", PermManager.suList);
        return SUCCESS;
    }

    static removeSu(plName)
    {
        if(!PermManager.suList.includes(plName))
            return i18n.tr("permManager.error.notInSuList", plName);
        PermManager.suList.removeByValue(plName);
        GlobalConf.set("SuList", PermManager.suList);
        return SUCCESS;
    }

    static isSu(player)
    {
        if(player == PermManager.CONSOLE)       // console is su
            return true;
        if(!player)
            return false;
        return PermManager.suList.includes(player.realName) || (PermManager.opIsSu && player.isOP());
    }


/////////////////////////////////////////////////////////////////////////////////////
///                              UserList Functions                               ///
/////////////////////////////////////////////////////////////////////////////////////

    static addUserToList(plName)
    {
        if(PermManager.userList.includes(plName))
            return i18n.tr("permManager.error.alreadyInList", plName, PermManager.userMode);

        PermManager.userList.push(plName);
        GlobalConf.set("UserList", PermManager.userList);
        return SUCCESS;
    }

    static removeUserFromList(plName)
    {
        if(!PermManager.userList.includes(plName))
            return i18n.tr("permManager.error.notInList", plName, PermManager.userMode);
        PermManager.userList.removeByValue(plName);
        GlobalConf.set("UserList", PermManager.userList);
        return SUCCESS;
    }

    // return true / false
    static isAllowInUserList(plName)
    {
        if(!this.isWhitelistMode() && PermManager.userList.includes(plName))
        {
            // plName in blacklist
            return false;
        }
        if(this.isWhitelistMode() && !PermManager.userList.includes(plName))
        {
            // plName not in whitelist
            return false;
        }
        return true;
    }


/////////////////////////////////////////////////////////////////////////////////////
///                                Owner Functions                                ///
/////////////////////////////////////////////////////////////////////////////////////

    // return SUCCESS / "fail reason"
    static setOwner(executor, fpName, newOwnerName)
    {
        let fp = FakePlayerManager.getFpInstance(fpName);
        if(!fp)
            return i18n.tr("fpManager.resultText.fpNoFound", fpName);

        let permConf = new JsonConfigFile(_FP_PERMISSION_DIR + `${fpName}.json`);
        let oldOwner = permConf.get("Owner", "");
        if(PermManager.isSu(executor) || oldOwner == "" || executor.realName == oldOwner)
        {
            // Have access to change owner
            if(!PermManager.isSu(executor))
            {
                // Check if new owner has space for new fp
                // (Su can have unlimited numbers of fps)
                let maxFpCountLimit = GlobalConf.get("MaxFpCountLimitEach", 3);
                let currentFpCount = PermManager.getPlayerOwnFpCount(newOwnerName);
                if(currentFpCount > maxFpCountLimit)
                {
                    // newOwnerName cannot have more fp
                    return i18n.tr("permManager.error.fpCountMaxLimitReached", newOwnerName);
                }
            }
            // Change owner
            permConf.set("Owner", newOwnerName);
            fp.setOwnerName(newOwnerName);
            FakePlayerManager.saveFpData(fpName);
            return SUCCESS;
        }
        else
            return i18n.tr("permManager.error.noAccess");
    }

    // return true / false
    static isFpOwner(player, fpName)
    {
        let fp = FakePlayerManager.getFpInstance(fpName);
        if(!fp)
            return i18n.tr("fpManager.resultText.fpNoFound", fpName);

        let owner = fp.getOwnerName();
        if(owner == "")
        {
            // This fp has no matched owner
            if(player)
                player.tell(i18n.tr("permManager.warning.fpNoOwner", fpName));
            logger.warn(`[FakePlayer] ` + i18n.tr("permManager.warning.fpNoOwner", fpName));
        }
        else
        {
            if(owner == player.realName)         // fp owner has all permissions
                return true;    
        }
        return false;
    }


/////////////////////////////////////////////////////////////////////////////////////
///                            Certain Perm Functions                             ///
/////////////////////////////////////////////////////////////////////////////////////

    static addCertainPerm(executor, fpName, plName, action)
    {
        let fp = FakePlayerManager.getFpInstance(fpName);
        if(!fp)
            return i18n.tr("fpManager.resultText.fpNoFound", fpName);

        if(PermManager.ONLY_CONSOLE_ACTIONS.includes(action))
        {
            // only_console_actions are not allowed to add perm to player
            return i18n.tr("permManager.error.permConsoleActionToPlayer", action);
        }
        if(action in PermManager.NO_PERM_REQUIRED_ACTIONS || action in PermManager.SPECIAL_PROCESS_ACTIONS)
        {
            // these action do not need perm
            return i18n.tr("permManager.error.noPermNeeded", action);
        }

        let executorName = executor.realName;
        let permConf = new JsonConfigFile(_FP_PERMISSION_DIR + `${fpName}.json`);
        let permsData = permConf.get("Perms", {});
        let owner = permConf.get("Owner", "");
        if(owner == "")
        {
            // This fp has no matched owner
            if(executor)
                executor.tell(i18n.tr("permManager.warning.fpNoOwner", fpName));
            logger.warn(`[FakePlayer] ` + i18n.tr("permManager.warning.fpNoOwner", fpName));
        }

        if(action == "admin")
        {
            // Only su or owner can give admin access
            if(PermManager.isSu(executor) || executorName == owner)
            {
                // Have access to set admin perm
                if(plName in permsData && permsData[plName].includes("admin"))
                {
                    // already exists
                    return i18n.tr("permManager.error.permAlreadyExists", plName, action);
                }
                else
                {
                    permsData[plName] = ['admin'];
                    permConf.set("Perms", permsData);
                    return SUCCESS;
                }
            }
            else
                return i18n.tr("permManager.error.noAccess");
        }
        else
        {
            // su or owner or admin can give certain access
            if(PermManager.isSu(executor) || executorName == owner
                || (executorName in permsData && permsData[executorName].includes("admin")))
            {
                // Have access to set perm
                if(plName in permsData)
                {
                    if(permsData[plName].includes("admin"))
                    {
                        // already exists admin, no need to add certain access
                        return i18n.tr("permManager.error.playerIsAlreadyAdmin", plName);
                    }
                    else if(permsData[plName].includes(action))
                    {
                        // already exists admin, no need to add certain access
                        return i18n.tr("permManager.error.permAlreadyExists", plName, action);
                    }
                }
                permsData[plName].push(action);
                permConf.set("Perms", permsData);
                return SUCCESS;
            }
            else
                return i18n.tr("permManager.error.noAccess");
        }
        return i18n.tr("permManager.error.noAccess");
    }

    static removeCertainPerm(executor, fpName, plName, action)
    {
        let fp = FakePlayerManager.getFpInstance(fpName);
        if(!fp)
            return i18n.tr("fpManager.resultText.fpNoFound", fpName);

        if(PermManager.ONLY_CONSOLE_ACTIONS.includes(action))
        {
            // only_console_actions are not allowed to add perm to player
            return i18n.tr("permManager.error.permConsoleActionToPlayer", action);
        }
        if(action in PermManager.NO_PERM_REQUIRED_ACTIONS || action in PermManager.SPECIAL_PROCESS_ACTIONS)
        {
            // these action do not need perm
            return i18n.tr("permManager.error.noPermNeeded", action);
        }

        let executorName = executor.realName;
        let permConf = new JsonConfigFile(_FP_PERMISSION_DIR + `${fpName}.json`);
        let permsData = permConf.get("Perms", {});
        let owner = permConf.get("Owner", "");
        if(owner == "")
        {
            // This fp has no matched owner
            if(executor)
                executor.tell(i18n.tr("permManager.warning.fpNoOwner", fpName));
            logger.warn(`[FakePlayer] ` + i18n.tr("permManager.warning.fpNoOwner", fpName));
        }

        if(action == "admin")
        {
            // Only su or owner can withdraw admin access
            if(PermManager.isSu(executor) || executorName == owner)
            {
                // Have access to withdraw admin perm
                if(!plName in permsData || !permsData[plName].includes("admin"))
                {
                    // perm not have
                    return i18n.tr("permManager.error.permNotHave", plName, action);
                }
                else
                {
                    permsData[plName].removeByValue("admin");
                    permConf.set("Perms", permsData);
                    return SUCCESS;
                }
            }
            else
                return i18n.tr("permManager.error.noAccess");
        }
        else
        {
            // su or owner or admin can withdraw certain access
            if(PermManager.isSu(executor) || executorName == owner
                || (executorName in permsData && permsData[executorName].includes("admin")))
            {
                // Have access to withdraw perm
                if(!plName in permsData || !permsData[plName].includes(action))
                {
                    // cannot withdraw not-exist perm
                    return i18n.tr("permManager.error.permNotHave", plName, action);
                }
                permsData[plName].removeByValue(action);
                permConf.set("Perms", permsData);
                return SUCCESS;
            }
            else
                return i18n.tr("permManager.error.noAccess");
        }
        return i18n.tr("permManager.error.noAccess");
    }

    // return true / false
    static checkIfHasCertainPerm(fpName, plName, action)
    {
        if(action in PermManager.NO_PERM_REQUIRED_ACTIONS || action in PermManager.SPECIAL_PROCESS_ACTIONS)
        {
            // these action do not need perm
            return true;
        }
        let permConf = new JsonConfigFile(_FP_PERMISSION_DIR + `${fpName}.json`);
        let permsData = permConf.get("Perms", {});
        if(permsData != {})
        {
            if(plName in permsData)
            {
                // if plName is fp admin, or has access to certain action
                if(permsData[plName].includes("admin") || permsData[plName].includes(action))
                    return true;
            }
        }
        return false;
    }

/////////////////////////////////////////////////////////////////////////////////////
///                               Public Functions                                ///
/////////////////////////////////////////////////////////////////////////////////////

    static initPermManager()
    {
        PermManager.suList = GlobalConf.get("SuList", []);
        PermManager.userList = GlobalConf.get("UserList", []);
        PermManager.userMode = GlobalConf.get("UserMode", "blacklist");
        if(PermManager.userMode != "whitelist" && PermManager.userMode != "blacklist")
            PermManager.userMode = "blacklist";
        PermManager.opIsSu = GlobalConf.get("OpIsSu", 1);
    }

    // return true / false
    // must sure that fp exists
    static hasPermission(player, action, fpName)
    {
        if(player == PermManager.CONSOLE)
        {
            // console always have access
            return true;
        }

        if(PermManager.ONLY_CONSOLE_ACTIONS.includes(action))
        {
            // Only allow executed in console! Ban it
            return false;
        }

        // If player is not valid, refuse
        if(!player)
            return false;
        let plName = player.realName;

        // Check if su
        if(PermManager.isSu(player))        // Su has all permissions
            return true;
        // Check if in whitelist/blacklist
        if(!PermManager.isAllowInUserList(plName))
            return false;
        // Special process
        if(action == "create")
        {
            return PermManager.checkPermToCreateNewFp(player);
        }
        if(action == "remove")
        {
            // only owner can remove his fp
            return PermManager.isFpOwner(player, fpName);
        }
        // Check if fp owner
        if(PermManager.isFpOwner(player, fpName))       // fp owner has all permissions
            return true;
        // Check if fp and action matches the rule
        if(PermManager.checkIfHasCertainPerm(fpName, plName, action))
            return true;
        return false;
    }

    // return SUCCESS / "fail reason"
    // must sure that fp exists
    static checkOriginPermission(origin, action, fpName)
    {
        let pl = origin.player;
        if(!pl)
        {
            // not player execute cmd, always pass
            return SUCCESS;
        }

        // refuse only console actions
        // origin.type == 7 is BDS console  
        if((PermManager.ONLY_CONSOLE_ACTIONS.includes(action)) && origin.type != 7)
        {   
            // logger.debug("only can in console!");
            return i18n.tr("permManager.error.onlyConsoleAction");
        }

        // check if the player have access
        if(PermManager.hasPermission(pl, action, fpName))
            return SUCCESS;
        else
            return i18n.tr("permManager.error.noAccess");
    }

    // return true / false
    static checkPermToCreateNewFp(player)
    {
        return PermManager.isSu(player) || PermManager.isAllowInUserList(plName);
    }

    // return PermData / null
    static getFpPermData(fpName)
    {
        let fp = FakePlayerManager.getFpInstance(fpName);
        if(!fp)
            return null;

        let permConf = new JsonConfigFile(_FP_PERMISSION_DIR + `${fpName}.json`);
        let result = {};
        result["Version"] = permConf.get("Version", 1);
        result["Owner"] = permConf.get("Owner", "");
        result["Perms"] = permConf.get("Perms", {});
        return result;
    }
}