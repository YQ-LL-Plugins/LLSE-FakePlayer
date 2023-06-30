import { SoftEnumInst } from "../Command/SoftEnumInst.js";
import { CmdCallback } from "../Command/CommandCallback.js";
import { 
    _LONG_OPERATIONS_LIST, _SHORT_OPERATIONS_LIST
} from "../Utils/GlobalVars.js";
import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";

export let FpListSoftEnum = null;
export let PlayerListSoftEnum = null;

export function RegisterCmd()
{
    let fpCmd = mc.newCommand("fpc", "§6LLSE-FakePlayer Control§r", PermType.Any, 0x80);

    // create soft enum
    FpListSoftEnum = new SoftEnumInst(fpCmd, "FakePlayerList", Object.keys(FakePlayerManager.fpListObj));
    PlayerListSoftEnum = new SoftEnumInst(fpCmd, "RealPlayerList", []);

    // fpc online/offline <fpname>
    fpCmd.setEnum("StatusAction", ["online", "offline"]);
    fpCmd.mandatory("action", ParamType.Enum, "StatusAction", "StatusAction", 1);
    fpCmd.mandatory("fpname", ParamType.SoftEnum, FpListSoftEnum.getName(), "fpname");
    fpCmd.overload(["StatusAction", "fpname"]);

    // fpc onlineall/offlineall
    fpCmd.setEnum("AllStatusAction", ["onlineall", "offlineall"]);
    fpCmd.mandatory("action", ParamType.Enum, "AllStatusAction", "AllStatusAction", 1);
    fpCmd.overload(["AllStatusAction"]);

    // fpc create <name> [createpos]
    fpCmd.setEnum("CreateAction", ["create"]);
    fpCmd.mandatory("action", ParamType.Enum, "CreateAction", "CreateAction", 1);
    fpCmd.mandatory("fpnewname", ParamType.String);
    fpCmd.optional("createpos", ParamType.Vec3);
    fpCmd.optional("createdimid", ParamType.Int);
    fpCmd.overload(["CreateAction", "fpnewname", "createpos", "createdimid"]);

    // fpc remove <fpname>
    fpCmd.setEnum("RemoveAction", ["remove"]);
    fpCmd.mandatory("action", ParamType.Enum, "RemoveAction", "RemoveAction", 1);
    fpCmd.overload(["RemoveAction", "fpname"]);     // fpname created before

    // fpc list [fpname]
    fpCmd.setEnum("ListAction", ["list"]);
    fpCmd.mandatory("action", ParamType.Enum, "ListAction", "ListAction", 1);
    fpCmd.optional("fpname2", ParamType.SoftEnum, FpListSoftEnum.getName(), "fpname2");
    fpCmd.overload(["ListAction", "fpname2"]);

    // fpc operation <fpname> attack/interact/clear [interval] [maxtimes] (short operations)
    fpCmd.setEnum("OperationAction", ["operation"]);
    fpCmd.setEnum("ShortOperationType", _SHORT_OPERATIONS_LIST);
    fpCmd.mandatory("action", ParamType.Enum, "OperationAction", "OperationAction", 1);
    fpCmd.mandatory("optype", ParamType.Enum, "ShortOperationType", "ShortOperationType", 1);
    fpCmd.optional("interval", ParamType.Int);
    fpCmd.optional("maxtimes", ParamType.Int);
    fpCmd.overload(["OperationAction", "fpname", "ShortOperationType", "interval", "maxtimes"]);
    // fpname created before

    // fpc operation <fpname> useitem [length] [interval] [maxtimes] (long operations)
    fpCmd.setEnum("LongOperationType", _LONG_OPERATIONS_LIST);
    fpCmd.mandatory("longoptype", ParamType.Enum, "LongOperationType", "LongOperationType", 1);
    fpCmd.optional("length", ParamType.Int);
    fpCmd.overload(["OperationAction", "fpname", "LongOperationType", "length", "interval", "maxtimes"]);
    // OperationAction, fpname, interval, maxtimes created before

    // fpc walkto/tp <fpname> <x> <y> <z>
    fpCmd.setEnum("PositionAction", ["walkto", "tp"]);
    fpCmd.mandatory("action", ParamType.Enum, "PositionAction", "PositionAction", 1);
    fpCmd.mandatory("targetpos", ParamType.Vec3);
    fpCmd.overload(["PositionAction", "fpname", "targetpos"]);      // fpname created before

    // fpc walkto/tp <fpname> <player>
    fpCmd.mandatory("player", ParamType.Player);
    fpCmd.overload(["PositionAction", "fpname", "player"]);         // fpname created before

    // fpc give/getinventory <fpname> 
    fpCmd.setEnum("InventoryAction", ["give", "getinventory"]);
    fpCmd.mandatory("action", ParamType.Enum, "InventoryAction", "InventoryAction", 1);
    fpCmd.overload(["InventoryAction", "fpname"]);      // fpname created before

    // fpc setselect <fpname> <slotid>
    fpCmd.setEnum("SetSelectAction", ["setselect"]);
    fpCmd.mandatory("action", ParamType.Enum, "SetSelectAction", "SetSelectAction", 1);
    fpCmd.mandatory("slotid", ParamType.Int);
    fpCmd.overload(["SetSelectAction", "fpname", "slotid"]);          // fpname created before

    // fpc drop <fpname> [slotid]
    fpCmd.setEnum("DropAction", ["drop"]);
    fpCmd.mandatory("action", ParamType.Enum, "DropAction", "DropAction", 1);
    fpCmd.optional("slotid2", ParamType.Int);
    fpCmd.overload(["DropAction", "fpname", "slotid2"]);        // fpname created before

    // fpc dropall <fpname>
    fpCmd.setEnum("DropAllAction", ["dropall"]);
    fpCmd.mandatory("action", ParamType.Enum, "DropAllAction", "DropAllAction", 1);
    fpCmd.overload(["DropAllAction", "fpname"]);        // fpname created before

    // fpc sync <fpname> start/stop
    fpCmd.setEnum("SyncAction", ["sync"]);
    fpCmd.setEnum("SyncType", ["start", "stop"]);
    fpCmd.mandatory("action", ParamType.Enum, "SyncAction", "SyncAction", 1);
    fpCmd.mandatory("synctype", ParamType.Enum, "SyncType", "SyncType", 1);
    fpCmd.overload(["SyncAction", "fpname", "synctype"]);       // fpname created before

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
    fpCmd.overload(["PermAction", "fpname", "permtype", "actionenum", "plname"]);
    // fpname created before

    // fpc perm <fpname> list
    fpCmd.setEnum("PermListType", ["list"]);
    fpCmd.mandatory("permlisttype", ParamType.Enum, "PermListType", "PermListType", 1);
    fpCmd.overload(["PermAction", "fpname", "permlisttype"]);
    // fpname created before

    // fpc perm <fpname> setowner <plname>
    fpCmd.setEnum("PermSetOwnerType", ["setowner"]);
    fpCmd.mandatory("permsetownertype", ParamType.Enum, "PermSetOwnerType", "PermSetOwnerType", 1);
    fpCmd.overload(["PermAction", "fpname", "permsetownertype", "plname"]);
    // fpname and plname created before

    // fpc settings setsu/removesu/ban/allow <plname>
    fpCmd.setEnum("SettingsAction", ["settings"]);
    fpCmd.setEnum("SettingsType", ["setsu", "removesu", "ban", "allow"]);
    fpCmd.mandatory("action", ParamType.Enum, "SettingsAction", "SettingsAction", 1);
    fpCmd.mandatory("settingstype", ParamType.Enum, "SettingsType", "SettingsType", 1);
    fpCmd.overload(["SettingsAction", "settingstype", "plname"]);
    // plname created before

    // fpc settings listsu
    fpCmd.setEnum("ListSuType", ["listsu"]);
    fpCmd.mandatory("listsutype", ParamType.Enum, "ListSuType", "ListSuType", 1);
    fpCmd.overload(["SettingsAction", "listsutype"]);

    // fpc settings maxfpcountlimit <limit>
    fpCmd.setEnum("SettingsItems", ["maxfpcountlimit"]);
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