import { _CONFIG_PATH } from "../Utils/GlobalVars.js";

let GlobalConf = null;

export {GlobalConf};

export function InitConfigFile()
{
    GlobalConf = new JsonConfigFile(_CONFIG_PATH);
    GlobalConf.init("LogLevel", 4);
    GlobalConf.init("OpIsAdmin", 1);
    GlobalConf.init("AdminList", []);
    GlobalConf.init("UserMode", "whitelist");
    GlobalConf.init("UserAllowAction", ["online", "offline", "list", "getinventory", "help", "gui"]);
    GlobalConf.init("UserList", []);
}