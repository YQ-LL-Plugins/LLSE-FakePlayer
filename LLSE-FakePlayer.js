//LiteLoaderScript Dev Helper
/// <reference path="c:\Users\yqs11\Desktop\Projects\Game\Minecraft\LLSE-Aids-Library/dts/HelperLib-master/src/index.d.ts"/> 

const _VER = [1,0,0];

/////////////////////////////////////////////////////////////////////////////////////
//                               FakePlayer Manager                                //
/////////////////////////////////////////////////////////////////////////////////////

let FakePlayersList = {};
let AdminXuidList = [];
let UserXuidList = [];


/////////////////////////////////////////////////////////////////////////////////////
//                            FakePlayer Instance Class                            //
/////////////////////////////////////////////////////////////////////////////////////

class FakePlayerInst
{
///////// private
    operationLoop(op)
    {

    }

///////// public
    constructor(name, x, y, z, dimid, operation = "", interval = 1000, maxTimes = 0)
    {
        this._name = name;
        this._pos = new FloatPos(x, y, z, dimid);
        this._operation = operation;        // attack / destroy / interact
        this._interval = interval;
        this._maxTimes = maxTimes;
        this._isOnline = false;
    }

    getPlayer()
    {
        let pl = mc.getPlayer(this._name);
        if(!pl || !pl.isSimulatedPlayer())
            return null;
        return pl;
    }

    online()
    {
        let pl = mc.spawnSimulatedPlayer(this._name, this._pos);
        if(!pl)
            return false;
        this._isOnline = true;
        return true;
    }

    offline()
    {
        let pl = this.getPlayer();
        if(!pl)
            return false;
        let success = pl.simulateDisconnect();
        if(!success)
            return false;
        this._isOnline = false;
        return true;
    }

    setOperation(operation)
    {
        this._operation = op;
    }

    isOnline()
    {
        return this._isOnline;
    }
}


/////////////////////////////////////////////////////////////////////////////////////
//                                 Main Functions                                  //
/////////////////////////////////////////////////////////////////////////////////////

function FpOnline(name)
{

}


/////////////////////////////////////////////////////////////////////////////////////
//                                    Soft Enum                                    //
/////////////////////////////////////////////////////////////////////////////////////

class SoftEnumInst
{
    constructor(cmdObj, name, initList = [])
    {
        this._cmdObj = cmdObj;
        this._name = name;
        cmdObj.setSoftEnum(name, initList);
    }

    add(item)
    {
        return this._cmdObj.addSoftEnumValues(this._name, [item]);
    }

    remove(item)
    {
        return this._cmdObj.removeSoftEnumValues(this._name, [item]);
    }

    getName()
    {
        return this._name;
    }
}

let FpListSoftEnum = null;


/////////////////////////////////////////////////////////////////////////////////////
//                                Command Registry                                 //
/////////////////////////////////////////////////////////////////////////////////////

// cmd callback
function cmdCallback(_cmd, ori, out, res)
{
    switch(res.action)
    {
    case "online":
        out.success(`/fpc online ${res.fpname}`);
        break;
    case "offline":
        out.success(`/fpc offline ${res.fpname}`);
        break;
    case "onlineall":
        out.success(`/fpc onlineall`);
        break;
    case "offlineall":
        out.success(`/fpc offlineall`);
        break;

    case "create":
        out.success(`/fpc create ${res.fpnewname}`);
        break;
    case "remove":
        out.success(`/fpc remove ${res.fpname}`);
        break;
    case "list":
        out.success(`/fpc list`);
        break;
    case "setop":
        out.success(`/fpc setop ${res.fpname} ${res.optype} ${res.interval} ${res.times}`);
        break;
    case "walkto":
        if(res.player)
            out.success(`/fpc walkto ${res.player.name}`);
        else
            out.success(`/fpc walkto ${res.targetpos.toString()}`);
        break;
    case "tp":
        if(res.player)
            out.success(`/fpc tp ${res.player.name}`);
        else
            out.success(`/fpc tp ${res.targetpos.toString()}`);
        break;
    
    case "give":
        out.success(`/fpc give`);
        break;
    case "getinventory":
        out.success(`/fpc getinventory`);
        break;
    case "drop":
        out.success(`/fpc drop ${res.slotid2}`);
        break;
    case "setselect":
        out.success(`/fpc setselect ${res.slotid}`);
        break;
    case "sync":
        out.success(`/fpc sync`);
        break;
    
    case "addadmin":
        out.success(`/fpc addadmin ${res.adminname}`);
        break;
    case "removeadmin":
        out.success(`/fpc removeadmin ${res.adminname}`);
        break;
    case "adduser":
        out.success(`/fpc adduser ${res.username}`);
        break;
    case "removeuser":
        out.success(`/fpc removeuser ${res.username}`);
        break;
    case "banuser":
        out.success(`/fpc banuser ${res.username}`);
        break;
    case "unbanuser":
        out.success(`/fpc unbanuser ${res.username}`);
        break;

    case "import":
        out.success(`/fpc import ${res.filepath}`);
        break;
    case "help":
        out.success(`/fpc help`);
        break;
    
    default:
    }
    return true;
}

// register cmd
function RegisterCmd(userMode)      // whitelist / blacklist
{
    let fpCmd = mc.newCommand("fakeplayercontrol", "§6LLSE-FakePlayer Control§r", PermType.Any, 0x80);
    fpCmd.setAlias("fpc");

    // create soft enum
    FpListSoftEnum = new SoftEnumInst(fpCmd, "FakePlayerList");

    // fpc online/offline <fpname>
    fpCmd.setEnum("StatusAction", ["online", "offline"]);
    fpCmd.mandatory("action", ParamType.Enum, "StatusAction", "StatusAction", 1);
    fpCmd.mandatory("fpname", ParamType.SoftEnum, FpListSoftEnum.getName());
    fpCmd.overload(["StatusAction", "fpname"]);

    // fpc onlineall/offlineall
    fpCmd.setEnum("AllStateAction", ["onlineall", "offlineall"]);
    fpCmd.mandatory("action", ParamType.Enum, "AllStateAction", "AllStateAction", 1);
    fpCmd.overload(["AllStateAction"]);

    // fpc create <name>
    fpCmd.setEnum("CreateAction", ["create"]);
    fpCmd.mandatory("action", ParamType.Enum, "CreateAction", "CreateAction", 1);
    fpCmd.mandatory("fpnewname", ParamType.String);
    fpCmd.overload(["CreateAction", "fpnewname"]);

    // fpc remove <fpname>
    fpCmd.setEnum("RemoveAction", ["remove"]);
    fpCmd.mandatory("action", ParamType.Enum, "RemoveAction", "RemoveAction", 1);
    fpCmd.overload(["RemoveAction", "fpname"]);     // fpname 前面创建了

    // fpc list
    fpCmd.setEnum("ListAction", ["list"]);
    fpCmd.mandatory("action", ParamType.Enum, "ListAction", "ListAction", 1);
    fpCmd.overload(["ListAction"]);

    // fpc setop <fpname> <optype> [interval] [times]
    fpCmd.setEnum("OperationAction", ["setop"]);
    fpCmd.setEnum("OperationType", ["attack", "destroy", "interact", "clear"]);
    fpCmd.mandatory("action", ParamType.Enum, "OperationAction", "OperationAction", 1);
    fpCmd.mandatory("optype", ParamType.Enum, "OperationType", "OperationType", 1);
    fpCmd.optional("interval", ParamType.Int);
    fpCmd.optional("times", ParamType.Int);
    fpCmd.overload(["OperationAction", "fpname", "OperationType", "interval", "times"]);
    // fpname 前面创建了

    // fpc walkto/tp <x> <y> <z>
    fpCmd.setEnum("PositionAction", ["walkto", "tp"]);
    fpCmd.mandatory("action", ParamType.Enum, "PositionAction", "PositionAction", 1);
    fpCmd.mandatory("targetpos", ParamType.BlockPos);
    fpCmd.overload(["PositionAction", "targetpos"]);

    // fpc walkto/tp <player>
    fpCmd.mandatory("player", ParamType.Player);
    fpCmd.overload(["PositionAction", "player"]);

    // fpc give/getinventory
    fpCmd.setEnum("InventoryAction", ["give", "getinventory"]);
    fpCmd.mandatory("action", ParamType.Enum, "InventoryAction", "InventoryAction", 1);
    fpCmd.overload(["InventoryAction"]);

    // fpc setselect <slotid>
    fpCmd.setEnum("SetSelectAction", ["setselect"]);
    fpCmd.mandatory("action", ParamType.Enum, "SetSelectAction", "SetSelectAction", 1);
    fpCmd.mandatory("slotid", ParamType.Int);
    fpCmd.overload(["SetSelectAction", "slotid"]);

    // fpc drop [slotid]
    fpCmd.setEnum("DropAction", ["drop"]);
    fpCmd.mandatory("action", ParamType.Enum, "DropAction", "DropAction", 1);
    fpCmd.optional("slotid2", ParamType.Int);
    fpCmd.overload(["DropAction", "slotid2"]);

    // fpc sync
    fpCmd.setEnum("SyncAction", ["sync"]);
    fpCmd.mandatory("action", ParamType.Enum, "SyncAction", "SyncAction", 1);
    fpCmd.overload(["SyncAction"]);

    // fpc addadmin/removeadmin <name>
    fpCmd.setEnum("AdminAction", ["addadmin", "removeadmin"]);
    fpCmd.mandatory("action", ParamType.Enum, "AdminAction", "AdminAction", 1);
    fpCmd.mandatory("adminname", ParamType.String);
    fpCmd.overload(["AdminAction", "adminname"]);

    // fpc adduser/removeuser/banuser/unbanuser <name>
    if(userMode == "whitelist")
        fpCmd.setEnum("UserAction", ["adduser", "removeuser"]);
    else
        fpCmd.setEnum("UserAction", ["banuser", "unbanuser"]);
    fpCmd.mandatory("action", ParamType.Enum, "UserAction", "UserAction", 1);
    fpCmd.mandatory("username", ParamType.String);
    fpCmd.overload(["UserAction", "username"]);

    // fpc import <path>
    fpCmd.setEnum("ImportAction", ["import"]);
    fpCmd.mandatory("action", ParamType.Enum, "ImportAction", "ImportAction", 1);
    fpCmd.mandatory("filepath", ParamType.RawText);
    fpCmd.overload(["ImportAction", "filepath"]);

    // fpc help
    fpCmd.setEnum("HelpAction", ["help"]);
    fpCmd.mandatory("action", ParamType.Enum, "HelpAction", "HelpAction", 1);
    fpCmd.overload(["HelpAction"]);

    fpCmd.setCallback(cmdCallback);
    fpCmd.setup();
}


/////////////////////////////////////////////////////////////////////////////////////
//                                      Main                                       //
/////////////////////////////////////////////////////////////////////////////////////

function main()
{
    ll.registerPlugin(
        /* name */ "LLSE-FakePlayer",
        /* introduction */ "A fake-player plugin for LiteLoaderBDS",
        /* version */ _VER,
        /* otherInformation */ {"Author": "yqs112358"}
    ); 

    //loadDataFromFile();
    logger.info(`LLSE-FakePlayer ${_VER} 已加载，开发者：yqs112358`);

    // 命令注册
    mc.listen("onServerStarted", () => {
        RegisterCmd("whitelist");
    });
}

main();