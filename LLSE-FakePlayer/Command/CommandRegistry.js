import { SoftEnumInst } from "../Command/SoftEnumInst.js";
import { CmdCallback } from "../Command/CommandCallback.js";
import { 
    _LONG_OPERATIONS_LIST, _SHORT_OPERATIONS_LIST
} from "../Utils/GlobalVars.js";
import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";

export let AllFpListSoftEnum = null;
export let OnlineFpListSoftEnum = null;
export let OfflineFpListSoftEnum = null;
export let PlayerListSoftEnum = null;

export function RegisterCmd()
{
    let fpCmd = mc.newCommand("fpc", "§6LLSE-FakePlayer Control§r", PermType.Any, 0x80);

    // create soft enum
    PlayerListSoftEnum = new SoftEnumInst(fpCmd, "RealPlayerList", []);
    AllFpListSoftEnum = new SoftEnumInst(fpCmd, "AllFakePlayerList", []);
    OnlineFpListSoftEnum = new SoftEnumInst(fpCmd, "OnlineFakePlayerList", []);
    OfflineFpListSoftEnum = new SoftEnumInst(fpCmd, "OfflineFakePlayerList", []);
    FakePlayerManager.forEachFp((fpName, fp) => {
        AllFpListSoftEnum.add(fpName);
        if(!fp.isOnline())
            OfflineFpListSoftEnum.add(fpName);
    });
    

    // fpc online <fpname>
    fpCmd.setEnum("OnlineAction", ["online"]);
    fpCmd.mandatory("action", ParamType.Enum, "OnlineAction", "OnlineAction", 1);
    fpCmd.mandatory("fpname_offline", ParamType.SoftEnum, OfflineFpListSoftEnum.getName(), "fpname_offline");
    fpCmd.overload(["OnlineAction", "fpname_offline"]);

    // fpc offline <fpname>
    fpCmd.setEnum("OfflineAction", ["offline"]);
    fpCmd.mandatory("action", ParamType.Enum, "OfflineAction", "OfflineAction", 1);
    fpCmd.mandatory("fpname_online", ParamType.SoftEnum, OnlineFpListSoftEnum.getName(), "fpname_online");
    fpCmd.overload(["OfflineAction", "fpname_online"]);

    // fpc switch <fpname>
    fpCmd.setEnum("SwitchAction", ["switch"]);
    fpCmd.mandatory("action", ParamType.Enum, "SwitchAction", "SwitchAction", 1);
    fpCmd.mandatory("fpname_all", ParamType.SoftEnum, AllFpListSoftEnum.getName(), "fpname_all");
    fpCmd.overload(["SwitchAction", "fpname_all"]);

    // fpc onlineall/offlineall
    fpCmd.setEnum("AllStatusAction", ["onlineall", "offlineall"]);
    fpCmd.mandatory("action", ParamType.Enum, "AllStatusAction", "AllStatusAction", 1);
    fpCmd.overload(["AllStatusAction"]);

    // fpc create <name> [createpos] [ownerName]
    fpCmd.setEnum("CreateAction", ["create"]);
    fpCmd.mandatory("action", ParamType.Enum, "CreateAction", "CreateAction", 1);
    fpCmd.mandatory("fpnewname", ParamType.String);
    fpCmd.optional("createpos", ParamType.Vec3);
    fpCmd.optional("createdimid", ParamType.Int);
    fpCmd.optional("ownername", ParamType.String);
    fpCmd.overload(["CreateAction", "fpnewname", "createpos", "createdimid", "ownername"]);

    // fpc remove <fpname>
    fpCmd.setEnum("RemoveAction", ["remove"]);
    fpCmd.mandatory("action", ParamType.Enum, "RemoveAction", "RemoveAction", 1);
    fpCmd.overload(["RemoveAction", "fpname_all"]);     // fpname_all created before

    // fpc list [fpname]
    fpCmd.setEnum("ListAction", ["list"]);
    fpCmd.mandatory("action", ParamType.Enum, "ListAction", "ListAction", 1);
    fpCmd.optional("fpname_optional", ParamType.SoftEnum, AllFpListSoftEnum.getName(), "fpname_optional");
    fpCmd.overload(["ListAction", "fpname_optional"]);

    // fpc operation <fpname> attack/interact/clear [interval] [maxtimes] (short operations)
    fpCmd.setEnum("OperationAction", ["operation"]);
    fpCmd.setEnum("ShortOperationType", _SHORT_OPERATIONS_LIST);
    fpCmd.mandatory("action", ParamType.Enum, "OperationAction", "OperationAction", 1);
    fpCmd.mandatory("optype", ParamType.Enum, "ShortOperationType", "ShortOperationType", 1);
    fpCmd.optional("interval", ParamType.Int);
    fpCmd.optional("maxtimes", ParamType.Int);
    fpCmd.overload(["OperationAction", "fpname_online", "ShortOperationType", "interval", "maxtimes"]);
    // fpname_online created before

    // fpc operation <fpname> useitem [length] [interval] [maxtimes] (long operations)
    fpCmd.setEnum("LongOperationType", _LONG_OPERATIONS_LIST);
    fpCmd.mandatory("longoptype", ParamType.Enum, "LongOperationType", "LongOperationType", 1);
    fpCmd.optional("length", ParamType.Int);
    fpCmd.overload(["OperationAction", "fpname_online", "LongOperationType", "length", "interval", "maxtimes"]);
    // OperationAction, fpname_online, interval, maxtimes created before

    // fpc walkto/tp <fpname> <x> <y> <z>
    fpCmd.setEnum("PositionAction", ["walkto", "tp"]);
    fpCmd.mandatory("action", ParamType.Enum, "PositionAction", "PositionAction", 1);
    fpCmd.mandatory("targetpos", ParamType.Vec3);
    fpCmd.overload(["PositionAction", "fpname_online", "targetpos"]);      // fpname_online created before

    // fpc walkto/tp <fpname> <player>
    fpCmd.mandatory("player", ParamType.Player);
    fpCmd.overload(["PositionAction", "fpname_online", "player"]);         // fpname_online created before

    // fpc give/getinventory <fpname> 
    fpCmd.setEnum("InventoryAction", ["give", "getinventory"]);
    fpCmd.mandatory("action", ParamType.Enum, "InventoryAction", "InventoryAction", 1);
    fpCmd.overload(["InventoryAction", "fpname_online"]);      // fpname_online created before

    // fpc setselect <fpname> <slotid>
    fpCmd.setEnum("SetSelectAction", ["setselect"]);
    fpCmd.mandatory("action", ParamType.Enum, "SetSelectAction", "SetSelectAction", 1);
    fpCmd.mandatory("slotid", ParamType.Int);
    fpCmd.overload(["SetSelectAction", "fpname_online", "slotid"]);          // fpname_online created before

    // fpc drop <fpname> [slotid]
    fpCmd.setEnum("DropAction", ["drop"]);
    fpCmd.mandatory("action", ParamType.Enum, "DropAction", "DropAction", 1);
    fpCmd.optional("slotid2", ParamType.Int);
    fpCmd.overload(["DropAction", "fpname_online", "slotid2"]);        // fpname_online created before

    // fpc dropall <fpname>
    fpCmd.setEnum("DropAllAction", ["dropall"]);
    fpCmd.mandatory("action", ParamType.Enum, "DropAllAction", "DropAllAction", 1);
    fpCmd.overload(["DropAllAction", "fpname_online"]);        // fpname_online created before

    // fpc sync <fpname> start/stop
    fpCmd.setEnum("SyncAction", ["sync"]);
    fpCmd.setEnum("SyncType", ["start", "stop"]);
    fpCmd.mandatory("action", ParamType.Enum, "SyncAction", "SyncAction", 1);
    fpCmd.mandatory("synctype", ParamType.Enum, "SyncType", "SyncType", 1);
    fpCmd.overload(["SyncAction", "fpname_online", "synctype"]);       // fpname_online created before

    // fpc perm <fpname> add/remove <actionname>/admin <plname>
    fpCmd.setEnum("PermAction", ["perm"]);
    fpCmd.setEnum("PermType", ["add", "remove"]);
    // all actions can be permed
    fpCmd.setEnum("ActionEnum", ["admin", "online", "offline", "operation", "walkto", "tp", "give", "getinventory"
        , "setselect", "drop", "dropall", "sync", "perm"]);
    fpCmd.mandatory("action", ParamType.Enum, "PermAction", "PermAction", 1);
    fpCmd.mandatory("permtype", ParamType.Enum, "PermType", "PermType", 1);
    fpCmd.mandatory("actionenum", ParamType.Enum, "ActionEnum", "ActionEnum", 1);
    fpCmd.mandatory("plname", ParamType.SoftEnum, PlayerListSoftEnum.getName(), "plname");
    fpCmd.overload(["PermAction", "fpname_all", "permtype", "actionenum", "plname"]);
    // fpname_all created before

    // fpc perm <fpname> list
    fpCmd.setEnum("PermListType", ["list"]);
    fpCmd.mandatory("permlisttype", ParamType.Enum, "PermListType", "PermListType", 1);
    fpCmd.overload(["PermAction", "fpname_all", "permlisttype"]);
    // fpname_all created before

    // fpc perm <fpname> setowner <plname>
    fpCmd.setEnum("PermSetOwnerType", ["setowner"]);
    fpCmd.mandatory("permsetownertype", ParamType.Enum, "PermSetOwnerType", "PermSetOwnerType", 1);
    fpCmd.overload(["PermAction", "fpname_all", "permsetownertype", "plname"]);
    // fpname_all and plname created before

    // fpc settings addsu/removesu/ban/allow <plname>
    fpCmd.setEnum("SettingsAction", ["settings"]);
    fpCmd.setEnum("SettingsType", ["addsu", "removesu", "ban", "allow"]);
    fpCmd.mandatory("action", ParamType.Enum, "SettingsAction", "SettingsAction", 1);
    fpCmd.mandatory("settingstype", ParamType.Enum, "SettingsType", "SettingsType", 1);
    fpCmd.overload(["SettingsAction", "settingstype", "plname"]);
    // plname created before

    // fpc settings listsu
    fpCmd.setEnum("ListSuType", ["listsu"]);
    fpCmd.mandatory("listsutype", ParamType.Enum, "ListSuType", "ListSuType", 1);
    fpCmd.overload(["SettingsAction", "listsutype"]);

    // fpc settings <settingsitem> <limit>
    fpCmd.setEnum("SettingsItems", ["maxfpcountlimit", "autoofflinewhenfrequentdeath"]);
    fpCmd.mandatory("settingsitems", ParamType.Enum, "SettingsItems", "SettingsItems", 1);
    fpCmd.mandatory("value", ParamType.Int);
    fpCmd.overload(["SettingsAction", "settingsitems", "value"]);

    // fpc import <path>
    fpCmd.setEnum("ImportAction", ["import"]);
    fpCmd.mandatory("action", ParamType.Enum, "ImportAction", "ImportAction", 1);
    fpCmd.mandatory("filepath", ParamType.RawText);
    fpCmd.overload(["ImportAction", "filepath"]);

    // fpc help
    fpCmd.setEnum("HelpAction", ["help"]);
    fpCmd.mandatory("action", ParamType.Enum, "HelpAction", "HelpAction", 1);
    fpCmd.overload(["HelpAction"]);

    // fpc gui
    fpCmd.setEnum("GuiAction", ["gui"]);
    fpCmd.mandatory("action", ParamType.Enum, "GuiAction", "GuiAction", 1);
    fpCmd.overload(["GuiAction"]);

    fpCmd.setCallback(CmdCallback);
    fpCmd.setup();
}