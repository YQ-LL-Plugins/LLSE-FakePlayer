import { _CONFIG_PATH } from "../Utils/GlobalVars.js";

let GlobalConf = null;

export {GlobalConf};

export function InitConfigFile()
{
    GlobalConf = new JsonConfigFile(_CONFIG_PATH);
    GlobalConf.init("Version", 2);      // config file version
    GlobalConf.init("LogLevel", 4);
    GlobalConf.init("MaxFpCountLimitEach", 3);
    GlobalConf.init("OpIsSu", 1);
    GlobalConf.init("SuList", []);
    GlobalConf.init("UserMode", "blacklist");
    GlobalConf.init("UserList", []);

    // if is old config file, process
    if(GlobalConf.get("OpIsAdmin") != null)
    {
        GlobalConf.delete("UserAllowAction");
        GlobalConf.set("UserMode", "blacklist");
        GlobalConf.set("UserList", []);

        GlobalConf.set("OpIsSu", GlobalConf.get("OpIsAdmin"));
        GlobalConf.delete("OpIsAdmin");

        GlobalConf.set("SuList", GlobalConf.get("AdminList"));
        GlobalConf.delete("AdminList");
    }
}