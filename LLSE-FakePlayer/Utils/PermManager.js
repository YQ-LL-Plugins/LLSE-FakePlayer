import { SUCCESS } from "../Utils/GlobalVars.js"
import { GlobalConf } from "../Utils/ConfigFileHelper.js"


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
    static adminList = null;
    static userList = null;
    static userMode = null;
    static userAllowAction = null;
    static opIsAdmin = null;
    static onlyConsoleAction = ["import", "addadmin", "removeadmin"];

    static initPermManager()
    {
        PermManager.adminList = GlobalConf.get("AdminList", []);
        PermManager.userList = GlobalConf.get("UserList", []);
        PermManager.userMode = GlobalConf.get("UserMode", "whitelist");
        if(PermManager.userMode != "whitelist" && PermManager.userMode != "blacklist")
            PermManager.userMode = "whitelist";
        PermManager.userAllowAction = GlobalConf.get("UserAllowAction", ["online", "offline", "list", "getinventory", "help"]);
        PermManager.opIsAdmin = GlobalConf.get("OpIsAdmin", 1);
    }

    static isWhitelistMode() { return PermManager.userMode == "whitelist"; }

    static isAdmin(player)
    {
        return PermManager.adminList.includes(player.realName) || (PermManager.opIsAdmin && player.isOP());
    }

    // return true / false
    static hasPermission(player, action)
    {
        if(PermManager.isAdmin(player))
            return true;
        
        let plName = player.realName;
        if(PermManager.userList.includes(plName))
        {
            if(PermManager.userMode == "whitelist" && PermManager.userAllowAction.includes(action))        // in whitelist and allow
                return true;
        }
        else
        {
            // plName not in userList
            if(PermManager.userMode == "blacklist" && PermManager.userAllowAction.includes(action))        // not in blacklist and allow
                return true;
        }
        return false;
    }

    // return SUCCESS / fail reason
    static checkOriginPermission(origin, action)
    {
        // refuse only console actions
        if((PermManager.onlyConsoleAction.includes(action)) && origin.type != 7)          // 7 is BDS console  
        {   
            // logger.debug("only can in console!");
            return i18n.tr("permManager.error.onlyConsoleAction");
        }

        let pl = origin.player;
        if(!pl)
        {
            //logger.debug("not player execute cmd, pass");
            return SUCCESS;
        }

        // ensure is player executed below
        if(PermManager.hasPermission(pl, action))
            return SUCCESS;
        else
            return i18n.tr("permManager.error.noAccess");
    }

    static addAdmin(plName)
    {
        logger.debug("addAdmin: ", plName);
        if(PermManager.adminList.includes(plName))
            return i18n.tr("permManager.error.alreadyInAdminList", plName);
        if(PermManager.userList.includes(plName))
        {
            logger.warn(`${plName} is removing from user ${PermManager.userMode}`);
            PermManager.userList.removeByValue(plName);
            GlobalConf.set("UserList", PermManager.userList);
        }

        PermManager.adminList.push(plName);
        GlobalConf.set("AdminList", PermManager.adminList);
        return SUCCESS;
    }

    static removeAdmin(plName)
    {
        if(!PermManager.adminList.includes(plName))
            return i18n.tr("permManager.error.notInAdminList", plName);
        PermManager.adminList.removeByValue(plName);
        GlobalConf.set("AdminList", PermManager.adminList);
        return SUCCESS;
    }

    static addUserToList(plName)
    {
        if(PermManager.adminList.includes(plName))
            return i18n.tr("permManager.error.setAdminTwice", plName);
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
}