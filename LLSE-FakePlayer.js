//LiteLoaderScript Dev Helper
/// <reference path="c:\Users\yqs11\Desktop\Projects\Game\Minecraft\LLSE-Aids-Library/dts/HelperLib-master/src/index.d.ts"/> 

const _VER = [1, 0, 1];
const _CONFIG_PATH = "./plugins/LLSE-FakePlayer/config.json";
const _FP_DATA_DIR = "./plugins/LLSE-FakePlayer/fpdata/";
const _FP_INVENTORY_DIR = "./plugins/LLSE-FakePlayer/fpinventorys/";

const _LLSE_HELP_TEXT = 
     '§e§l[LLSE-FakePlayer]§r\nLiteLoaderBDS平台强大的假人插件\n'
    +'- GitHub: https://github.com/YQ-LL-Plugins/LLSE-FakePlayer\n'
    +'- 作者: yqs112358';             //TODO            


/////////////////////////////////////////////////////////////////////////////////////
//                                     Helpers                                     //
/////////////////////////////////////////////////////////////////////////////////////

const _DEFAULT_PLAYER_SELECT_SLOT = 0;
const SUCCESS = "";
const _LONG_OPERATIONS_LIST = ["useitem"];
const _SHORT_OPERATIONS_LIST = ["attack", "interact"/*, "destroy", "place" */, "clear"];
const _VALID_DIMENSION_NAMES = ["主世界", "下界", "末地"];

function CalcPosFromViewDirection(oldPos, nowDirection, distance)
{
    let yaw = (nowDirection.yaw + 180) / 180 * Math.PI;
    let vector = [Math.sin(yaw) * distance, 0, -Math.cos(yaw) * distance];
    return new FloatPos(oldPos.x + vector[0], oldPos.y, oldPos.z + vector[2], oldPos.dimid);
}

function IsNumberInt(num)
{
    return num % 1 == 0;
}

function IsValidDimId(dimid)
{
    return IsNumberInt(dimid) && dimid >= 0 && dimid <= _VALID_DIMENSION_NAMES.length - 1;
}

Array.prototype.removeByValue = function (val) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === val) {
            this.splice(i, 1);
            i--;
        }
    }
    return this;
}

// parse "x y z", return {x:x, y:y, z:z} / null
function ParsePositionString(posStr)
{
    if(posStr.length == 0)
        return null;

    if(posStr.startsWith("("))
        posStr = posStr.substring(1);
    if(posStr.endsWith(")"))
        posStr = posStr.substring(0, posStr.length - 1);

    let splitter = '';
    if(posStr.indexOf(" ") != -1)
        splitter = " ";
    else if(posStr.indexOf(",") != -1)
        splitter = ",";
    else
        return null;
    
    let resArr = posStr.split(splitter);
    if(resArr.length != 3 || resArr[0].length == 0 || resArr[1].length == 0 || resArr[2].length == 0)
        return null;
    let [x,y,z] = [Number(resArr[0]), Number(resArr[1]), Number(resArr[2])];
    if(isNaN(x) || isNaN(y) || isNaN(z))
        return null;
    return {"x":x, "y":y, "z":z};
}

function EntityGetFeetPos(entity)
{
    let feetPos = entity.feetPos;
    if(!feetPos)
    {
        feetPos = entity.pos;
        feetPos.y -= 1.62;
    }
    return feetPos;
}


/////////////////////////////////////////////////////////////////////////////////////
//                                   Config File                                   //
/////////////////////////////////////////////////////////////////////////////////////
let GlobalConf = null;

function InitConfigFile()
{
    GlobalConf = new JsonConfigFile(_CONFIG_PATH);
    GlobalConf.init("LogLevel", 4);
    GlobalConf.init("OpIsAdmin", 1);
    GlobalConf.init("AdminList", []);
    GlobalConf.init("UserMode", "whitelist");
    GlobalConf.init("UserAllowAction", ["online", "offline", "list", "getinventory", "help", "gui"]);
    GlobalConf.init("UserList", []);
}


/////////////////////////////////////////////////////////////////////////////////////
//                                   Perm Manager                                  //
/////////////////////////////////////////////////////////////////////////////////////
class PermManager
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
            return "此操作只能在服务端控制台中执行";
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
            return "你没有权限执行此操作";
    }

    static addAdmin(plName)
    {
        logger.debug("addAdmin: ", plName);
        if(PermManager.adminList.includes(plName))
            return `${plName} 已在管理员列表中`;
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
            return `${plName} 不在管理员列表中`;
        PermManager.adminList.removeByValue(plName);
        GlobalConf.set("AdminList", PermManager.adminList);
        return SUCCESS;
    }

    static addUserToList(plName)
    {
        if(PermManager.adminList.includes(plName))
            return `${plName}已在管理员列表中，不能被设置两次`;
        if(PermManager.userList.includes(plName))
            return `${plName}已经在${PermManager.userMode}列表中`;

        PermManager.userList.push(plName);
        GlobalConf.set("UserList", PermManager.userList);
        return SUCCESS;
    }

    static removeUserFromList(plName)
    {
        if(!PermManager.userList.includes(plName))
            return `${plName}不在${PermManager.userMode}列表中`;
        PermManager.userList.removeByValue(plName);
        GlobalConf.set("UserList", PermManager.userList);
        return SUCCESS;
    }
}


/////////////////////////////////////////////////////////////////////////////////////
//                            FakePlayer Instance Class                            //
/////////////////////////////////////////////////////////////////////////////////////

class FakePlayerInst
{
///////// private
    static opCallback(thiz)
    {
        //logger.debug("op start");
        return function() {
            if(thiz._operation == "" || !thiz._isOnline)
                return;
            let pl = thiz.getPlayer();
            if(!pl)
                return;

            let isLongOperation = false;
            switch(thiz._operation)
            {
            case "attack":
                pl.simulateAttack();
                break;
            case "destroy":
                pl.simulateDestroy();
                break;
            case "interact":
                pl.simulateInteract();
                break;
            case "useitem":
                isLongOperation = true;
                pl.simulateUseItem();
                break;
            }

            // next loop
            if(isLongOperation)
                thiz._opTimeTask = setTimeout(FakePlayerInst.opReachLength(thiz), thiz._opLength);
            else
            {
                // check max times
                if(thiz._opMaxTimes > 0)
                {
                    --thiz._opMaxTimes;
                    if(thiz._opMaxTimes == 0)
                    {
                        thiz.clearOperation();
                        return;
                    }
                }
                thiz._opTimeTask = setTimeout(FakePlayerInst.opCallback(thiz), thiz._opInterval);
            }
        };
    }

    static opReachLength(thiz)
    {
        //logger.debug("op reach length");
        return function() {
            if(thiz._operation == "" || !thiz._isOnline)
                return;
            let pl = thiz.getPlayer();
            if(!pl)
                return;

            switch(thiz._operation)
            {
            case "useitem":
                pl.simulateStopUsingItem();
                break;
            }

            // check max times
            if(thiz._opMaxTimes > 0)
            {
                --thiz._opMaxTimes;
                if(thiz._opMaxTimes == 0)
                {
                    thiz.clearOperation();
                    return;
                }
            }
            thiz._opTimeTask = setTimeout(FakePlayerInst.opCallback(thiz), thiz._opInterval);
        };
    }

    tickLoop()
    {
        // sync
        if(this._syncXuid != "")
        {
            let pl = this.getPlayer();
            if(!pl)
                return;

            let targetPlayer = mc.getPlayer(this._syncXuid);
            if(targetPlayer)
            {
                // sync move
                let isMoving = false;
                if(!this._lastSyncPlayerPos)
                    this._lastSyncPlayerPos = EntityGetFeetPos(targetPlayer);
                else
                {
                    let oldPos = this._lastSyncPlayerPos;
                    let newPos = EntityGetFeetPos(targetPlayer);
                    if(oldPos.dimid != newPos.dimid)
                    {
                        this._pos.x = newPos.x;
                        this._pos.y = newPos.y;
                        this._pos.z = newPos.z;
                        this._pos.dimid = newPos.dimid;
                        pl.teleport(newPos);
                        this._lastSyncPlayerPos = newPos;
                        isMoving = true;
                    }
                    else
                    {
                        let dx = newPos.x - oldPos.x;
                        let dy = newPos.y - oldPos.y;
                        let dz = newPos.z - oldPos.z;
                        if(Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(dz) < 0.1)
                            pl.simulateStopMoving();        // if distance too short, do not move
                        else
                        {
                            this._pos.x += dx;
                            this._pos.y += dy;
                            this._pos.z += dz;
                            this._pos.dimid = newPos.dimid;
                            let newTarget = new FloatPos(this._pos.x, this._pos.y, this._pos.z, this._pos.dimid);
                            //logger.debug(`Goto ${newTarget}`);
                            pl.simulateMoveTo(newTarget);
                            this._lastSyncPlayerPos = newPos;
                            isMoving = true;
                        }
                    }
                }

                // if not moving, sync others
                if(!isMoving)
                {
                    // sync body rotation
                    pl.simulateSetBodyRotation(targetPlayer.direction.yaw);
                    // sync look at
                    let targetEntity = targetPlayer.getEntityFromViewVector();
                    if(targetEntity)
                        pl.simulateLookAt(targetEntity);
                    else
                    {
                        let targetBlock = targetPlayer.getBlockFromViewVector();
                        if(targetBlock)
                            pl.simulateLookAt(targetBlock);
                    }
                }
            }
        }
    }

///////// public
    constructor(name, pos, operation = "", opInterval = 1000, opMaxTimes = 1, opLength = 1000, syncXuid = "", isOnline = false)
    {
        this._name = name;
        this._pos = pos;
        this._isOnline = isOnline;

        this._operation = operation;
        this._opInterval = opInterval;
        this._opMaxTimes = opMaxTimes;
        this._opLength = opLength;
        this._opTimeTask = null;        // private

        this._syncXuid = syncXuid;
        this._lastSyncPlayerPos = null;     // private
    }
    getAllInfo()
    {
        return {
            name: this._name, pos: this._pos, isOnline: this._isOnline,
            operation: this._operation, opInterval: this._opInterval, opMaxTimes: this._opMaxTimes, 
            opLegnth: this._opLength, syncXuid: this._syncXuid
        };
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
        if(mc.getPlayer(this._name) != null)
            return true;
        let posData = this._pos;
        // logger.debug(posData.x, " ", posData.y, " ", posData.z, " ", posData.dimid);
        let spawnPos = new FloatPos(eval(posData.x), eval(posData.y), eval(posData.z), eval(posData.dimid));
        let pl = mc.spawnSimulatedPlayer(this._name, spawnPos);
        if(!pl)
            return false;
        this._isOnline = true;
        if(this._operation != "")
            this.startOpLoop();
        return true;
    }
    offline()
    {
        if(!this.isOnline())
            return true;
        let pl = this.getPlayer();
        if(!pl)
            return false;
        let success = pl.simulateDisconnect();
        if(!success)
            return false;
        this._isOnline = false;
        this.stopOpLoop();
        return true;
    }
    setPos(x, y, z, dimid)
    {
        this._pos.x = x;
        this._pos.y = y;
        this._pos.z = z;
        this._pos.dimid = dimid;
    }
    getPos()        // return {x:x, y:y, z:z, dimid:dimid}
    {
        return this._pos;
    }
    updatePos()
    {
        let pl = this.getPlayer();
        if(pl)
        {
            let pos = EntityGetFeetPos(pl);
            this.setPos(pos.x, pos.y, pos.z, pos.dimid);
        }
    }
    startOpLoop()
    {
        FakePlayerInst.opCallback(this)();        // operate once immediately
    }
    stopOpLoop()
    {
        if(this._opTimeTask)
        {
            clearInterval(this._opTimeTask);
            this._opTimeTask = null;
        }
    }
    setShortOperation(operation, opInterval = 1000, opMaxTimes = 1)
    {
        this.stopOpLoop();
        this._operation = operation;
        this._opInterval = opInterval;
        this._opMaxTimes = opMaxTimes;
        this.startOpLoop();
        FakePlayerManager.saveFpData(this._name);
    }
    setLongOperation(operation, opInterval = 1000, opMaxTimes = 1, opLength = 1000)
    {
        this.stopOpLoop();
        this._operation = operation;
        this._opInterval = opInterval;
        this._opMaxTimes = opMaxTimes;
        this._opLength = opLength;
        this.startOpLoop();
        FakePlayerManager.saveFpData(this._name);
    }
    clearOperation()
    {
        this.stopOpLoop();
        let pl = this.getPlayer();
        if(pl)
        {
            switch(this._operation)
            {
            case "attack":
                break;
            case "destroy":
                pl.simulateStopDestroyingBlock();
                break;
            case "interact":
                pl.simulateStopInteracting();
                break;
            case "useitem":
                pl.simulateStopUsingItem();
                break;
            }
        }
        this._operation = "";
        FakePlayerManager.saveFpData(this._name);
    }
    isNeedTick()
    {
        return this._syncXuid != "";
    }
    startSync(targetXuid)
    {
        this._syncXuid = targetXuid;
    }
    stopSync()
    {
        this._syncXuid = "";
        this._lastSyncPlayerPos = null;
    }
    isOnline()
    {
        return this._isOnline != 0;
    }
    saveAllItems()
    {
        let pl = this.getPlayer();
        if(!pl)
            return null;
        let comp = new NbtCompound();
        // inventory
        let plNbt = pl.getNbt();
        let inventoryListTag = plNbt.getTag("Inventory");
        comp.setTag("Inventory", inventoryListTag);
        // armor
        let armorListTag = plNbt.getTag("Armor");
        comp.setTag("Armor", armorListTag);
        // offhand
        let offhandListTag = plNbt.getTag("Offhand");
        comp.setTag("Offhand", offhandListTag);

        let snbtStr = comp.toSNBT();
        comp.removeTag("Inventory").removeTag("Armor").removeTag("Offhand").destroy();
        return snbtStr;
    }
    loadAllItems(snbtStr)
    {
        let pl = this.getPlayer();
        if(!pl)
            return false;
        let comp = NBT.parseSNBT(snbtStr);
        if(!comp)
            return false;
        
        let plNbt = pl.getNbt();
        plNbt.setTag("Inventory", comp.getTag("Inventory"));
        plNbt.setTag("Armor", comp.getTag("Armor"));
        plNbt.setTag("Offhand", comp.getTag("Offhand"));
        if(!pl.setNbt(plNbt))
            return false;
        comp.removeTag("Inventory").removeTag("Armor").removeTag("Offhand").destroy();
        return true;
    }
}


/////////////////////////////////////////////////////////////////////////////////////
//                               FakePlayer Manager                                //
/////////////////////////////////////////////////////////////////////////////////////

class FakePlayerManager
{
//////// private
    static fpListObj = {};
    static needTickFpListObj = {}

    // return Player / null
    static getPlayer(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return null;
        return FakePlayerManager.fpListObj[fpName].getPlayer();
    }

    // return FpInstance / undefined
    static getFpInstance(fpName)
    {
        return FakePlayerManager.fpListObj[fpName];
    }

    // callback(fpName, fpInst);
    static forEachFp(callback)
    {
        for(let fpName in FakePlayerManager.fpListObj)
            callback(fpName, FakePlayerManager.fpListObj[fpName]);
    }

    static onTick()
    {
        for(let key in FakePlayerManager.needTickFpListObj)
        {
            FakePlayerManager.needTickFpListObj[key].tickLoop();
        }
    }

    static onPlayerDie(player, source)
    {
        if(!player)
            return;
        let fpName = player.realName;
        if(fpName in FakePlayerManager.fpListObj)
        {
            logger.warn(`[FakePlayer] ${fpName}死亡。正在重生...`);
            let fp = FakePlayerManager.fpListObj[fpName];
            if(!fp.offline())
                logger.warn(`[FakePlayer] 重新创建${fpName}失败`);
            else
            {
                setTimeout(()=>{
                    if(!fp.online())
                        logger.warn(`[FakePlayer] ${fpName}重生失败`);
                    else
                    {
                        // teleport to target pos
                        let targetPos = fp.getPos();
                        let result = FakePlayerManager.teleportToPos(fpName, new FloatPos(eval(targetPos.x), eval(targetPos.y), 
                            eval(targetPos.z),eval(targetPos.dimid)));
                        if(result != SUCCESS)
                            logger.warn(`[FakePlayer] ${fpName}已重生，不过` + result);
                        else
                            logger.warn(`[FakePlayer] ${fpName}已重生`);
                    }
                }, 500);
            }
        }
    }

//////// public
    static online(fpName, failIfOnline = true)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(failIfOnline && fp.isOnline())
            return `§6${fpName}§r已上线`;

        if(!fp.online())
            return `上线§6${fpName}§r失败`;
        // teleport to target pos
        let targetPos = fp.getPos();
        let result = FakePlayerManager.teleportToPos(fpName, new FloatPos(eval(targetPos.x), eval(targetPos.y), 
            eval(targetPos.z),eval(targetPos.dimid)));
        if(result != SUCCESS)
            return `§6${fpName}§r已创建，不过` + result;

        if(fp.isNeedTick())
            FakePlayerManager.needTickFpListObj[fpName] = fp;
        FakePlayerManager.saveFpData(fpName, false);
        FakePlayerManager.loadInventoryData(fpName);
        return SUCCESS;
    }

    static offline(fpName, failIfOffline = true)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(failIfOffline && !fp.isOnline())
            return `§6${fpName}§r已下线`;

        if(fpName in FakePlayerManager.needTickFpListObj)
            delete FakePlayerManager.needTickFpListObj[fpName];
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`保存${fpName}的物品栏失败`);

        fp.updatePos();
        if(!fp.offline())
            return `§6${fpName}§r下线失败`;
        FakePlayerManager.saveFpData(fpName, false);
        return SUCCESS;
    }

    // return ["fail result", ["aaa", "bbb", ...]] / [SUCCESS, ["aaa", "bbb", ...]]
    static onlineAll()
    {
        let resultStr = "";
        let successNames = [];
        for(let fpName of Object.keys(FakePlayerManager.fpListObj))
        {
            if(FakePlayerManager.fpListObj[fpName].isOnline())
                continue;
            let res = FakePlayerManager.online(fpName, false);
            if(res != SUCCESS)
                resultStr += res + "\n";
            else
                successNames.push(fpName);
        }
        if(resultStr == "")
            return [SUCCESS, successNames];
        else
            return [resultStr.substring(0, resultStr.length - 1), successNames];
    }

    // return ["fail result", ["aaa", "bbb", ...]] / [SUCCESS, ["aaa", "bbb", ...]]
    static offlineAll()
    {
        let resultStr = "";
        let successNames = [];
        for(let fpName of Object.keys(FakePlayerManager.fpListObj))
        {
            if(!FakePlayerManager.fpListObj[fpName].isOnline())
                continue;
            let res = FakePlayerManager.offline(fpName, false);
            if(res != SUCCESS)
                resultStr += res + "\n"
            else
                successNames.push(fpName);
        }
        if(resultStr == "")
            return [SUCCESS, successNames];
        else
            return [resultStr.substring(0, resultStr.length - 1), successNames];
    }

    static createNew(fpName, x, y, z, dimid)
    {
        if(fpName in FakePlayerManager.fpListObj)
            return `§6${fpName}§r已存在。请使用命令"/fpc online ${fpName}"上线假人`;
        FakePlayerManager.fpListObj[fpName] = new FakePlayerInst(fpName, {'x':x.toFixed(2), 'y':y.toFixed(2), 'z':z.toFixed(2), 'dimid':dimid});
        FpListSoftEnum.add(fpName);
        FakePlayerManager.saveFpData(fpName, false);
        return SUCCESS;
    }

    static remove(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        if(FakePlayerManager.fpListObj[fpName].isOnline())
        {
            FakePlayerManager.offline(fpName, false);
        }
        delete FakePlayerManager.fpListObj[fpName];

        if(fpName in FakePlayerManager.needTickFpListObj)
            delete FakePlayerManager.needTickFpListObj[fpName];
        FpListSoftEnum.remove(fpName);
        FakePlayerManager.deleteFpData(fpName);
        FakePlayerManager.deleteInventoryData(fpName);
        return SUCCESS;
    }

    // return [SUCCESS, ["aaa", "bbb", ...] ]
    static list()
    {
        return [SUCCESS, Object.keys(FakePlayerManager.fpListObj)];
    }

    // return ["fail message", null] / [SUCCESS, {xxx:xxx, ...}]
    static getAllInfo(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return [`§6${fpName}§r未找到。请先创建此假人`, null];
        let fp = FakePlayerManager.fpListObj[fpName];
        return [SUCCESS, fp.getAllInfo()];
    }

    // return ["fail message", null] / [SUCCESS, {xxx:xxx, ...}]
    static getPosition(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return [`§6${fpName}§r未找到。请先创建此假人`, null];
        let fp = FakePlayerManager.fpListObj[fpName];
        return [SUCCESS, fp.getPos()];
    }

    // return ["fail message", null] / [SUCCESS, true / false]
    static isOnline(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return [`§6${fpName}§r未找到。请先创建此假人`, null];
        let fp = FakePlayerManager.fpListObj[fpName];
        return [SUCCESS, fp.isOnline()];
    }

    static setOperation(fpName, operation, opInterval, opMaxTimes, opLength)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];

        if(operation == "clear")
        {
            fp.clearOperation();
        }
        else
        {
            if(!opInterval)
                opInterval = 1000;
            if(!opMaxTimes)
                opMaxTimes = 1;
            if(!opLength)
                opLength = 1000;

            if(_LONG_OPERATIONS_LIST.includes(operation))
                fp.setLongOperation(operation, opInterval, opMaxTimes, opLength);
            else
                fp.setShortOperation(operation, opInterval, opMaxTimes);
        }
        return SUCCESS;
    }

    static clearOperation(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        FakePlayerManager.fpListObj[fpName].clearOperation();
        return SUCCESS;
    }

    // return ["fail reason", null] / [SUCCESS, {isFullPath:Boolean, path:Number[3][]} ]
    static walkToPos(fpName, pos)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return [`§6${fpName}§r未找到。请先创建此假人`, null];
        
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return [`§6${fpName}§r并不在线`, null];
        let pl = fp.getPlayer();
        if(!pl)
            return [`获取假人§6${fpName}§r失败`, null];
        if(pos.dimid != pl.pos.dimid)
            return [`§6${fpName}§r不在目标维度中`, null];
        let res = pl.simulateNavigateTo(pos);
        if(!res)
            return [`目标导航失败`, null];
        
        if(res.path.length > 0)
        {
            let lastPathPos = res.path[res.path.length - 1];
            let dimid = fp.getPos().dimid;
            fp.setPos(lastPathPos[0], lastPathPos[1], lastPathPos[2], dimid);
            FakePlayerManager.saveFpData(fpName);
        }
        return [SUCCESS, res];
    }

    // return ["fail reason", null] / [SUCCESS, {isFullPath:Boolean, path:Number[3][]} ]
    static walkToEntity(fpName, entity)
    {
        if(!entity)
            return ["目标实体无效", null];
        if(!(fpName in FakePlayerManager.fpListObj))
            return [`§6${fpName}§r未找到。请先创建此假人`, null];
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return [`获取假人§6${fpName}§r失败`, null];
        if(pl.pos.dimid != entity.pos.dimid)
            return [`§6${fpName}§r不在目标维度中`, null];
        let res = pl.simulateNavigateTo(EntityGetFeetPos(entity));
        if(!res)
            return [`目标导航失败`, null];
        
        if(res.path.length > 0)
        {
            let lastPathPos = res.path[res.path.length - 1];
            let dimid = fp.getPos().dimid;
            fp.setPos(lastPathPos[0], lastPathPos[1], lastPathPos[2], dimid);
            FakePlayerManager.saveFpData(fpName);
        }
        return [SUCCESS, res];
    }

    static teleportToPos(fpName, pos)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return `获取假人§6${fpName}§r失败`;
        if(!pl.teleport(pos))
            return `传送§6${fpName}§r失败`;
        
        fp.setPos(pos.x, pos.y, pos.z, pos.dimid);
        FakePlayerManager.saveFpData(fpName, false);
        return SUCCESS;
    }

    static teleportToEntity(fpName, entity)
    {
        if(!entity)
            return "目标实体无效";
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return `获取假人§6${fpName}§r失败`;
        let pos = EntityGetFeetPos(entity);
        if(!pl.teleport(pos))
            return `传送假人§6${fpName}§r失败`;
        
        fp.setPos(pos.x, pos.y, pos.z, pos.dimid);
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    static giveItem(fpName, player)
    {
        if(!player)
            return "来源玩家无效";
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return `获取假人§6${fpName}§r失败`;

        let itemOld = player.getHand();
        if(itemOld.isNull())
            return SUCCESS;
        let itemNew = itemOld.clone();
        let inventory = pl.getInventory();
        // check inventory has room
        if(inventory.hasRoomFor(itemNew))
        {
            if(!inventory.addItem(itemNew))
                return `未能成功将物品给予§6${fpName}§r`;
        }
        else
        {
            // drop out hand first
            result = FakePlayerManager.dropItem(fpName, _DEFAULT_PLAYER_SELECT_SLOT);
            if(result != SUCCESS)
                return "为新物品腾出空间失败：" + result;
            if(!inventory.addItem(itemNew))
                return `未能成功将物品给予§6${fpName}§r`;
        }
        itemOld.setNull();
        player.refreshItems();
        pl.refreshItems();
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return SUCCESS;
    }

    // return [SUCCESS, {Hand: {name:"xxx", count:64}, OffHand: {name:"xxx", count:32}, 
    //      Inventory: [null, {name:"xxx", count:64}, {...}], Armor: [{...}, {...}] } ]
    // / ["fail reason", null]
    static getInventory(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return [`§6${fpName}§r未找到。请先创建此假人`, null];
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return [`获取假人§6${fpName}§r失败`, null];
        let res = {Hand: null, OffHand: null, Inventory: [], Armor: []};

        // hand
        let handItem = pl.getHand();
        if(!handItem.isNull())
            res.Hand = {name: handItem.name, count: handItem.count};

        // offhand
        let offHandItem = pl.getOffHand();
        if(!offHandItem.isNull())
            res.OffHand = {name: offHandItem.name, count: offHandItem.count};

        // inventory
        let inventory = pl.getInventory();
        for(let item of inventory.getAllItems())
        {
            if(item.isNull())
                res.Inventory.push(null);
            else
                res.Inventory.push({name: item.name, count: item.count});
        }

        // armor
        let armor = pl.getArmor();
        for(let item of armor.getAllItems())
        {
            if(item.isNull())
                res.Armor.push(null);
            else
                res.Armor.push({name: item.name, count: item.count});
        }
        return [SUCCESS, res];
    }

    static setSelectSlot(fpName, slotId)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return `获取假人§6${fpName}§r失败`;

        // Assuming that selected slotid defaults to 0
        let oldSlotId = _DEFAULT_PLAYER_SELECT_SLOT;
        if(oldSlotId == slotId)
            return SUCCESS;
        
        let inventory = pl.getInventory();
        let itemOld = inventory.getItem(oldSlotId);
        let itemNew = inventory.getItem(slotId);
        if(itemNew.isNull())
        {
            if(!itemOld.setNull())
                return `移除§6${fpName}§r的旧物品失败`;
        }
        else
        {
            let itemOldClone = itemOld.clone();
            if(!inventory.setItem(oldSlotId, itemNew.clone()))
                return `移除§6${fpName}§r的旧物品失败`;
            if(!inventory.setItem(slotId, itemOldClone))
                return `设置§6${fpName}§r的新物品失败`;
        }
        pl.refreshItems();
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return SUCCESS;
    }

    static dropItem(fpName, slotId)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return `获取假人§6${fpName}§r失败`;

        if(!slotId)
            slotId = _DEFAULT_PLAYER_SELECT_SLOT;
        let inventory = pl.getInventory();
        let item = inventory.getItem(slotId);
        if(item.isNull())
            return `槽位${slotId}为空`;
        // spawn dropped item at 2 blocks away
        if(!mc.spawnItem(item.clone(), CalcPosFromViewDirection(EntityGetFeetPos(pl), pl.direction, 2)))
            return `丢出物品失败`;
        if(!inventory.removeItem(slotId, item.count))
            return "假人物品栏移除旧物品失败";
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return SUCCESS;
    }

    static dropAllItems(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        let pl = fp.getPlayer();
        if(!pl)
            return `获取假人§6${fpName}§r失败`;
        
        let inventory = pl.getInventory();
        let size = inventory.size;

        let resultStr = "";
        for(let slotId=0; slotId < size; ++slotId)
        {
            let item = inventory.getItem(slotId);
            if(item.isNull())
                continue;
            // spawn dropped item at 2 blocks away
            if(!mc.spawnItem(item.clone(), CalcPosFromViewDirection(EntityGetFeetPos(pl), pl.direction, 2)))
                resultStr += `丢弃槽位${slotId}的物品失败\n`;
            if(!inventory.removeItem(slotId, item.count))
                resultStr += `移除槽位${slotId}的旧物品失败\n`;
        }
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return resultStr == "" ? SUCCESS : resultStr.substring(0, resultStr.length - 1);
    }

    static startSync(fpName, player)
    {
        if(!player)
            return "目标玩家无效";
        if(player.isSimulatedPlayer())
            return "无法与另一个家人进行sync同步";
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        fp.startSync(player.xuid);

        FakePlayerManager.needTickFpListObj[fpName] = fp;
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    static stopSync(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return `§6${fpName}§r未找到。请先创建此假人`;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r并不在线`;
        fp.stopSync();

        let pl = fp.getPlayer();
        if(pl)
            pl.simulateStopMoving();

        if(fpName in FakePlayerManager.needTickFpListObj)
            delete FakePlayerManager.needTickFpListObj[fpName];
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    // return ["SUCCESS", "Help text"]
    static getHelp()
    {
        return [SUCCESS, _LLSE_HELP_TEXT];
    }

    // return true / false
    static saveFpData(fpName, updatePos = true)
    {
        let fp = FakePlayerManager.fpListObj[fpName];
        if(updatePos)
            fp.updatePos();
        File.writeTo(_FP_DATA_DIR + `${fpName}.json`, JSON.stringify(fp, null, 4));
        return true;
    }

    // return true / false
    static deleteFpData(fpName)
    {
        return File.delete(_FP_DATA_DIR + `${fpName}.json`);
    }

    // return true / false
    static loadAllFpData()
    {
        if(!File.exists(_FP_DATA_DIR))
        {
            File.mkdir(_FP_DATA_DIR);
            return true;
        }
        else
        {
            let fileNamesArr = File.getFilesList(_FP_DATA_DIR);
            for(let fileName of fileNamesArr)
            {
                let path = _FP_DATA_DIR + fileName;
                if(File.checkIsDir(path) || !fileName.endsWith(".json"))
                    continue;
                let fpName = fileName.substring(0, fileName.length - 5);    // remove .json

                let jsonStr = File.readFrom(path);
                if(jsonStr.length == 0 || jsonStr == "{}")
                    continue;
                
                let fpData = null;
                try
                {
                    fpData = JSON.parse(jsonStr);
                    // logger.debug(`${fpName}'s FpData: `, fpData);
                    if(!(fpData instanceof Object))
                        return false;
                    if(fpName != fpData._name)
                        throw Error("Bad fpdata file content");
                }
                catch(err) { 
                    logger.error(`Error when parsing fakeplayer ${fpName}'s data record: ` + err);
                    return false; 
                }
    
                FakePlayerManager.fpListObj[fpName] = new FakePlayerInst(
                    fpData._name, fpData._pos, fpData._operation, fpData._opInterval, 
                    fpData._opMaxTimes, fpData._opLength, fpData._syncXuid, fpData._isOnline);
            }
            return true;
        }
    }

    // return true / false
    static saveInventoryData(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return false;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.getPlayer())
            return false;

        let inventoryStr = fp.saveAllItems();
        // logger.debug(inventoryStr);
        if(!File.exists(_FP_INVENTORY_DIR))
            File.mkdir(_FP_INVENTORY_DIR);
        return File.writeTo(_FP_INVENTORY_DIR + `${fpName}.snbt`, inventoryStr);
    }

    // return true / false
    static loadInventoryData(fpName)
    {
        if(!(fpName in FakePlayerManager.fpListObj))
            return false;
        let fp = FakePlayerManager.fpListObj[fpName];
        if(!fp.getPlayer())
            return false;

        if(!File.exists(_FP_INVENTORY_DIR))
        {
            File.mkdir(_FP_INVENTORY_DIR);
            return false;
        }
        let snbtStr = File.readFrom(_FP_INVENTORY_DIR + `${fpName}.snbt`);
        if(!snbtStr)
            return false;
        return fp.loadAllItems(snbtStr);
    }

    // return true / false
    static deleteInventoryData(fpName)
    {
        return File.delete(_FP_INVENTORY_DIR + `${fpName}.snbt`);
    }

    static initialAutoOnline()
    {
        let resultStr = "";
        for(let fpName in FakePlayerManager.fpListObj)
        {
            // if fp is online at shutdown, recover him
            if(FakePlayerManager.fpListObj[fpName].isOnline())
            {
                let res = FakePlayerManager.online(fpName, false);
                if(res != SUCCESS)
                    resultStr += res + "\n";
            }
        }
        return resultStr == "" ? SUCCESS : resultStr.substring(0, resultStr.length - 1);
    }
}


/////////////////////////////////////////////////////////////////////////////////////
//                                   Export APIs                                   //
/////////////////////////////////////////////////////////////////////////////////////

ll.export(FakePlayerManager.online ,"_LLSE_FakePlayer_PLUGIN_", "online");
ll.export(FakePlayerManager.offline, "_LLSE_FakePlayer_PLUGIN_", "offline");
ll.export(FakePlayerManager.onlineAll, "_LLSE_FakePlayer_PLUGIN_", "onlineAll");
ll.export(FakePlayerManager.offlineAll ,"_LLSE_FakePlayer_PLUGIN_", "offlineAll");
ll.export(FakePlayerManager.createNew ,"_LLSE_FakePlayer_PLUGIN_", "createNew");
ll.export(FakePlayerManager.remove ,"_LLSE_FakePlayer_PLUGIN_", "remove");
ll.export(FakePlayerManager.list ,"_LLSE_FakePlayer_PLUGIN_", "list");
ll.export(FakePlayerManager.getAllInfo ,"_LLSE_FakePlayer_PLUGIN_", "getAllInfo");
ll.export(FakePlayerManager.getPosition ,"_LLSE_FakePlayer_PLUGIN_", "getPosition");
ll.export(FakePlayerManager.isOnline ,"_LLSE_FakePlayer_PLUGIN_", "isOnline");
ll.export(FakePlayerManager.setOperation ,"_LLSE_FakePlayer_PLUGIN_", "setOperation");
ll.export(FakePlayerManager.clearOperation ,"_LLSE_FakePlayer_PLUGIN_", "clearOperation");
ll.export(FakePlayerManager.walkToPos ,"_LLSE_FakePlayer_PLUGIN_", "walkToPos");
ll.export(FakePlayerManager.walkToEntity ,"_LLSE_FakePlayer_PLUGIN_", "walkToEntity");
ll.export(FakePlayerManager.teleportToPos ,"_LLSE_FakePlayer_PLUGIN_", "teleportToPos");
ll.export(FakePlayerManager.teleportToEntity ,"_LLSE_FakePlayer_PLUGIN_", "teleportToEntity");
ll.export(FakePlayerManager.giveItem ,"_LLSE_FakePlayer_PLUGIN_", "giveItem");
ll.export(FakePlayerManager.getInventory ,"_LLSE_FakePlayer_PLUGIN_", "getInventory");
ll.export(FakePlayerManager.setSelectSlot ,"_LLSE_FakePlayer_PLUGIN_", "setSelectSlot");
ll.export(FakePlayerManager.dropItem ,"_LLSE_FakePlayer_PLUGIN_", "dropItem");
ll.export(FakePlayerManager.dropAllItems ,"_LLSE_FakePlayer_PLUGIN_", "dropAllItems");
ll.export(FakePlayerManager.getHelp ,"_LLSE_FakePlayer_PLUGIN_", "getHelp");
ll.export(FakePlayerManager.saveFpData ,"_LLSE_FakePlayer_PLUGIN_", "saveFpData");
ll.export(FakePlayerManager.saveInventoryData ,"_LLSE_FakePlayer_PLUGIN_", "saveInventoryData");


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
//                                 Command Process                                 //
/////////////////////////////////////////////////////////////////////////////////////

function cmdCallback(_cmd, ori, out, res)
{
    let permRes = PermManager.checkOriginPermission(ori, res.action);
    if(permRes != SUCCESS)
    {
        out.error("[FakePlayer] " + permRes);
        return;
    }

    // logger.debug("OriginType: ", ori.type);
    let result;
    switch(res.action)
    {
    case "online":
        result = FakePlayerManager.online(res.fpname);
        if (result == SUCCESS)
            out.success(`[FakePlayer] §6${res.fpname}§r已上线`);
        else
            out.error("[FakePlayer] " + result);
        break;
    case "offline":
        result = FakePlayerManager.offline(res.fpname);
        if(result == SUCCESS)
            out.success(`[FakePlayer] §6${res.fpname}§r已下线`);
        else
            out.error("[FakePlayer] " + result)
        break;
    case "onlineall":
        {
            let successNames = [];
            [result, successNames] = FakePlayerManager.onlineAll();

            let namesList = "";
            for(let name of successNames)
                namesList += `§6${name}§r, `;
            namesList = namesList.substring(0, namesList.length - 2);
            if(result == SUCCESS)
                out.success("[FakePlayer] 所有假人上线成功:\n" + namesList);
            else
                out.error("[FakePlayer] 有部分假人发生错误：" + result + "\n这些假人已经成功上线:\n" + namesList);
            break;
        }
    case "offlineall":
        {
            let successNames = [];
            [result, successNames] = FakePlayerManager.offlineAll();

            let namesList = "";
            for(let name of successNames)
                namesList += `§6${name}§r, `;
            namesList = namesList.substring(0, namesList.length - 2);
            if(result == SUCCESS)
                out.success("[FakePlayer] 所有假人下线成功:\n" + namesList);
            else
                out.error("[FakePlayer] 有部分假人发生错误：" + result + "\n这些假人已经成功下线:\n" + namesList);
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
                    out.error(`[FakePlayer] ${dimid}不是一个有效的维度ID`);
                    break;
                }
                spawnPos.dimid = dimid;
            }
            else if(ori.player)
                spawnPos.dimid = ori.player.pos.dimid;
            else
            {
                out.error(`[FakePlayer] 无法创建，你必须传入一个有效的维度ID`);
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
            out.error(`[FakePlayer] 无法创建，你必须传入一个有效的坐标`);
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
        out.success(`[FakePlayer] §6${fpName}§r已创建`);
        break;
    }
    case "remove":
    {
        let fpName = res.fpname;
        if(ori.player)
        {
            // send confirm dialog
            FpGuiForms.sendAskForm(ori.player, 
                `你确定要删除假人§6${fpName}§r吗？\n他所有的数据将被清除，且无法恢复。`,
                (pl)=>
            {
                let removeResult = FakePlayerManager.remove(fpName);
                if(removeResult != SUCCESS)
                    pl.tell("[FakePlayer] " + removeResult);
                else
                    pl.tell(`[FakePlayer] §6${fpName}§r已删除`);
            }, (pl)=>
            {
                pl.tell("[FakePlayer] 动作已取消");
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
            out.success(`[FakePlayer] §6${fpName}§r已删除`);
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
                    out.success(`[FakePlayer] 共有${result.length}个假人:\n${namesStr}`);
                }
                else
                    out.success(`[FakePlayer] 共有0个假人。`);
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
                    out.success(`[FakePlayer] §6${fpName}§r:\n`
                        + `- 坐标: ${posObj.toString()}\n`
                        + `- 执行操作: ${result.operation ? result.operation : "无"}\n`
                        + `- 同步玩家: ${syncPlayerName ? syncPlayerName : "无"}\n`
                        + `- 状态: ${result.isOnline ? "§a§l在线§r" : "§c§l离线§r"}`
                    );
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
                out.success(`[FakePlayer] §6${res.fpname}§r执行操作已清除`);
            else
                out.success(`[FakePlayer] §6${res.fpname}§r被设置为执行：${res.optype}`);
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
            out.success(`[FakePlayer] §6${res.fpname}§r被设置为执行：${res.longoptype}`);
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
                out.success(`[FakePlayer] 目标已设置。正在走向玩家${target.name}...`);
            else
            {
                let fpPos = FakePlayerManager.getPosition(res.fpname)[1];
                let dimid = fpPos ? fpPos.dimid : target.pos.dimid;

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] 无法到达预定目标。路径将在${lastPathPoint.toString()}终止。`
                    +` 正在走向路径终止位置...`);
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
                out.success(`[FakePlayer] 目标已设置。正在走向坐标${res.targetpos}...`);
            else
            {
                let fpPos = FakePlayerManager.getPosition(res.fpname)[1];
                let dimid = fpPos ? fpPos.dimid : 0;        // if cannot get dimid, guess that is 0

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] 无法到达预定目标。路径将在${lastPathPoint.toString()}终止。`
                    +` 正在走向路径终止位置...`);
            }
        }
        else
            out.error(`[FakePlayer] 目标位置无效`)
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
            out.success(`[FakePlayer] §6${res.fpname}§r已被传送到${target.name}`);
        }
        else if (res.targetpos)
        {
            result = FakePlayerManager.teleportToPos(res.fpname, res.targetpos);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] §6${res.fpname}§r已被传送到${res.targetpos}`);
        }
        else
            out.error(`[FakePlayer] 目标位置无效`)
        break;
    
    case "give":
        if(!ori.player)
            out.error("[FakePlayer] Only players can do this action!");
        else
        {
            result = FakePlayerManager.giveItem(res.fpname, ori.player);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] 物品已被给予§6${res.fpname}§r`);
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
            let resStr = `[FakePlayer] §6${res.fpname}§r的物品栏:\n`;

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
        out.success(`[FakePlayer] §6${res.fpname}§r已丢出物品`);
        break;
    case "dropall":
        result = FakePlayerManager.dropAllItems(res.fpname);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] §6${res.fpname}§r已丢出背包中所有物品`);
        break;
    case "setselect":
        result = FakePlayerManager.setSelectSlot(res.fpname, res.slotid);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] 选中槽位已切换`);
        break;
    case "sync":
        if(!ori.player)
            out.error("[FakePlayer] Only players can do this action!");
        else
        {
            if(res.synctype == "start")
                result = FakePlayerManager.startSync(res.fpname, ori.player);
            else if (res.synctype == "stop")
                result = FakePlayerManager.stopSync(res.fpname);
            else
            {
                out.error(`[FakePlayer] 未知操作: ${res.synctype}`);
                break;
            }

            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(res.synctype == "start")
                out.success(`[FakePlayer] §6${res.fpname}§r的玩家同步已开始。 `
                    + `使用命令"/fpc sync stop"停止玩家同步。`);
            else
                out.success(`[FakePlayer] §6${res.fpname}§r的玩家同步已停止。`);
        }
        break;
    
    case "addadmin":
    {
        let plName = res.adminname;
        result = PermManager.addAdmin(plName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ${plName} added to admin list.`);
        else
            out.error("[FakePlayer] " + result);
        break;
    }
    case "removeadmin":
    {
        let plName = res.adminname;
        result = PermManager.removeAdmin(plName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ${plName} removed from admin list.`);
        else
            out.error("[FakePlayer] " + result);
        break;
    }
    case "adduser":
    {
        if(!PermManager.isWhitelistMode())
        {
            out.error('[FakePlayer] User为黑名单模式. 请使用命令"/fpc banuser <user>" 或 "/fpc unbanuser <user>"');
            break;
        }
        let plName = res.username;
        result = PermManager.addUserToList(plName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ${plName}已加入User白名单`);
        else
            out.error("[FakePlayer] " + result);
        break;
    }
    case "removeuser":
    {
        if(!PermManager.isWhitelistMode())
        {
            out.error('[FakePlayer] User为黑名单模式. 请使用命令"/fpc banuser <user>" 或 "/fpc unbanuser <user>"');
            break;
        }
        let plName = res.username;
        result = PermManager.removeUserFromList(plName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ${plName}已从User白名单移除`);
        else
            out.error("[FakePlayer] " + result);
        break;
    }
    case "banuser":
    {
        if(PermManager.isWhitelistMode())
        {
            out.error('[FakePlayer] User为白名单模式。请使用命令"/fpc adduser <user>" or "/fpc removeuser <user>"');
            break;
        }
        let plName = res.username;
        result = PermManager.addUserToList(plName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ${plName}已加入User黑名单`);
        else
            out.error("[FakePlayer] " + result);
        break;
    }
    case "unbanuser":
    {
        if(PermManager.isWhitelistMode())
        {
            out.error('[FakePlayer] User为白名单模式。请使用命令"/fpc adduser <user>" or "/fpc removeuser <user>"');
            break;
        }
        let plName = res.username;
        result = PermManager.removeUserFromList(plName);
        if(result == SUCCESS)
            out.success(`[FakePlayer] ${plName}已从User黑名单移除`);
        else
            out.error("[FakePlayer] " + result);
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


/////////////////////////////////////////////////////////////////////////////////////
//                                Command Registry                                 //
/////////////////////////////////////////////////////////////////////////////////////

function RegisterCmd(userMode)      // whitelist / blacklist
{
    let fpCmd = mc.newCommand("fpc", "§6LLSE-FakePlayer Control§r", PermType.Any, 0x80);

    // create soft enum
    FpListSoftEnum = new SoftEnumInst(fpCmd, "FakePlayerList", Object.keys(FakePlayerManager.fpListObj));

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

    // fpc gui
    fpCmd.setEnum("GuiAction", ["gui"]);
    fpCmd.mandatory("action", ParamType.Enum, "GuiAction", "GuiAction", 1);
    fpCmd.overload(["GuiAction"]);

    fpCmd.setCallback(cmdCallback);
    fpCmd.setup();
}


/////////////////////////////////////////////////////////////////////////////////////
//                                      GUI                                        //
/////////////////////////////////////////////////////////////////////////////////////

// wrapper for SimpleForm for easier routing
class BetterSimpleForm
{
    constructor(title = null, content = null)
    {
        this.fm = mc.newSimpleForm();
        this.buttonCallbacks = [];
        this.cancelCallback = function(pl) {};

        if(title)
            this.setTitle(title);
        if(content)
            this.setContent(content);
    }
    setTitle(title)
    {
        return this.fm.setTitle(title);
    }
    setContent(title)
    {
        return this.fm.setContent(title);
    }
    addButton(text, image = "", callback = function(pl){})
    {
        let res = this.fm.addButton(text, image);
        this.buttonCallbacks.push(callback);
        return res;
    }
    setCancelCallback(callback)
    {
        this.cancelCallback = callback;
    }
    send(player)
    {
        player.sendForm(this.fm, (function(buttonCallbacks, cancelCallback) {
            return (pl, id) => {
                if(id == null)
                    cancelCallback(pl);
                else if(buttonCallbacks[id])
                    buttonCallbacks[id](pl);
            }
        })(this.buttonCallbacks, this.cancelCallback));
    }
}

// wrapper for SimpleForm for easier usage
class BetterCustomFormResult
{
    constructor(idNameMap, dataArr)
    {
        this.results = {};
        for(let i=0; i<idNameMap.length; ++i)
            this.results[idNameMap[i]] = dataArr[i];
    }
    get(name)
    {
        return this.results[name];
    }
    forEach(callback)
    {
        for(let name in this.results)
            callback(name, this.results[name]);
    }
}

class BetterCustomForm
{
    constructor(title = null)
    {
        this.fm = mc.newCustomForm();
        this.idNameMap = [];
        this.submitCallback = function(pl, resultObj) {};
        this.cancelCallback = function(pl) {};

        if(title)
            this.setTitle(title);
    }
    setTitle(title)
    {
        return this.fm.setTitle(title);
    }
    addLabel(name, text)
    {
        this.idNameMap.push(name);
        return this.fm.addLabel(text);
    }
    addInput(name, title, placeholder = "", def = "")
    {
        this.idNameMap.push(name);
        return this.fm.addInput(title, placeholder, def);
    }
    addSwitch(name, title, def = false)
    {
        this.idNameMap.push(name);
        return this.fm.addSwitch(title, def);
    }
    addDropdown(name, title, items, def = 0)
    {
        this.idNameMap.push(name);
        return this.fm.addDropdown(title, items, def);
    }
    addSlider(name, title, min, max, step = 1, def = min)
    {
        this.idNameMap.push(name);
        return this.fm.addSlider(title, min, max, step, def);
    }
    addStepSlider(name, title, items, def = 0)
    {
        this.idNameMap.push(name);
        return this.fm.addStepSlider(title, items, def);
    }
    setSubmitCallback(callback)
    {
        this.submitCallback = callback;
    }
    setCancelCallback(callback)
    {
        this.cancelCallback = callback;
    }
    send(player)
    {
        player.sendForm(this.fm, (pl, resultArr) =>
        {
            if(!resultArr)
                this.cancelCallback(pl);
            else
            {
                let resultObj = new BetterCustomFormResult(this.idNameMap, resultArr);
                this.submitCallback(pl, resultObj);
            }
        });
    }
}


class FpGuiForms
{
    ////// Tool dialogs
    static sendSuccessForm(player, infoText, callback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 操作成功", 
            "§a§l成功:§r\n" + infoText, "OK", "关闭", (pl, res)=>{ callback(pl); });
    }

    static sendErrorForm(player, errMsg, callback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 发生错误", 
            "§c§l发生错误:§r\n" + errMsg, "OK", "关闭", (pl, res)=>{ callback(pl); });
    }

    static sendInfoForm(player, infoText, callback = function(pl){})
    {
        player.sendModalForm("LLSE-FakePlayer 消息对话框", infoText, "OK", "关闭", (pl, res)=>{ callback(pl); });
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

        if(PermManager.hasPermission(player, "online") && PermManager.hasPermission(player, "offline"))
        {
            fm.addButton("假人快速上下线", "textures/ui/move", (pl) => { FpGuiForms.sendQuickOnOfflineForm(pl);});
        }
        fm.addButton("假人执行操作", "textures/items/iron_pickaxe", (pl) => { FpGuiForms.sendOperationMenu(pl); });
        // if(PermManager.isAdmin(player))
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
        if(PermManager.hasPermission(player, "create"))
        {
            fm.addButton("创建新假人", "textures/ui/color_plus", (pl) => {
                FpGuiForms.sendCreateNewForm(player);
            });
        }
        FakePlayerManager.forEachFp((fpName, fp) => {
            let statusStr = fp.isOnline() ? "§a在线§r" : "§4离线§r";
            fm.addButton(`${fpName} - ${statusStr}`, "", (pl) => { FpGuiForms.sendFpInfoForm(pl, fpName); });
        });
        if(PermManager.hasPermission(player, "onlineall"))
        {
            fm.addButton("上线所有假人", "textures/ui/up_arrow", (pl) =>
            {
                let successNames = [];
                let result = "";
                [result, successNames] = FakePlayerManager.onlineAll();

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
        }
        if(PermManager.hasPermission(player, "offlineall"))
        {
            fm.addButton("下线所有假人", "textures/ui/down_arrow", (pl) => 
            {
                let successNames = [];
                let result = "";
                [result, successNames] = FakePlayerManager.offlineAll();

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
        }
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

            // create
            let result = FakePlayerManager.createNew(fpName, spawnPos.x, spawnPos.y, spawnPos.z, spawnPos.dimid);
            if(result != SUCCESS)
            {
                FpGuiForms.sendErrorForm(pl, result, (pl) => {FpGuiForms.sendFpListForm(pl);});
                return;
            }
            // online
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

            let fm = new BetterSimpleForm("LLSE-FakePlayer 假人信息");
            fm.setContent(`§6${fpName}§r假人信息：\n`
                + `- 坐标： ${posObj.toString()}\n`
                + `- 执行操作： ${result.operation ? result.operation : "None"}\n`
                + `- 同步玩家： ${syncPlayerName ? syncPlayerName : "None"}\n`
                + `- 状态： ${result.isOnline ? "§a§l在线§r" : "§c§l离线§r"}`
            );
            if(result.isOnline && PermManager.hasPermission(player, "offline"))
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
            else if (PermManager.hasPermission(player, "online"))
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
            if(PermManager.hasPermission(player, "remove"))
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
            let isOnline = fp.isOnline();
            let statusStr = isOnline ? "在线" : "离线";
            let prefix = isOnline ? "§a" : "§c";
            fm.addSwitch(fpName, `${prefix}${fpName} - ${statusStr}§r`, isOnline ? true : false);
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

        let atLeastOneItem = false;
        if(PermManager.hasPermission(player, "operation"))
        {
            atLeastOneItem = true;
            fm.addButton("执行/清除假人操作", "", (pl)=>{ FpGuiForms.sendDoClearOpMenu(pl); });
        }
        if(PermManager.hasPermission(player, "walkto"))
        {
            atLeastOneItem = true;
            fm.addButton("假人走向指定坐标", "", (pl)=>{ FpGuiForms.sendWalkToPosForm(pl); });
            fm.addButton("假人走向指定玩家", "", (pl)=>{ FpGuiForms.sendWalkToPlayerForm(pl); });
        }
        if(PermManager.hasPermission(player, "tp"))
        {
            atLeastOneItem = true;
            fm.addButton("假人传送到指定坐标", "", (pl)=>{ FpGuiForms.sendTpToPosForm(pl); });
            fm.addButton("假人传送到指定玩家", "", (pl)=>{ FpGuiForms.sendTpToPlayerForm(pl); });
        }
        if(PermManager.hasPermission(player, "sync"))
        {
            atLeastOneItem = true;
            fm.addButton("假人与玩家同步", "", (pl)=>{ FpGuiForms.sendSyncForm(pl); });
        }
        fm.addButton("返回上一级", "", (pl) => { FpGuiForms.sendMainMenu(pl); });

        if(atLeastOneItem)
            fm.setContent("§e请选择操作：§r");
        else
            fm.setContent("§e对不起，你无权执行此操作§r");
        fm.send(player);
    }

    // fakeplayer do/clear operation
    static sendDoClearOpMenu(player)
    {
        let fm = new BetterCustomForm("LLSE-FakePlayer 执行/清除假人操作");
        fm.addLabel("label1", "§e选择操作并填写参数：§r\n");

        let fpsList = FakePlayerManager.list()[1];
        let opsArr = _LONG_OPERATIONS_LIST.concat(_SHORT_OPERATIONS_LIST);
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
        let fm = new BetterCustomForm("LLSE-FakePlayer 假人行走");
        fm.addLabel("label1", "§e选择目标位置：§r\n");

        let fpsList = FakePlayerManager.list()[1];
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
        let fm = new BetterCustomForm("LLSE-FakePlayer 假人行走");
        fm.addLabel("label1", "§e选择目标：§r\n");

        let fpsList = FakePlayerManager.list()[1];
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
        let fm = new BetterCustomForm("LLSE-FakePlayer 假人传送");
        fm.addLabel("label1", "§e选择目标位置：§r\n");

        let fpsList = FakePlayerManager.list()[1];
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
        let fm = new BetterCustomForm("LLSE-FakePlayer 假人传送");
        fm.addLabel("label1", "§e选择目标：§r\n");

        let fpsList = FakePlayerManager.list()[1];
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
        let fm = new BetterCustomForm("LLSE-FakePlayer 假人玩家同步");
        fm.addLabel("label1", "§e选择目标玩家：§r\n");

        let fpsList = FakePlayerManager.list()[1];
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
        if(PermManager.hasPermission(player, "getinventory"))
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
        if(PermManager.hasPermission(player, "give"))
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
        if(PermManager.hasPermission(player, "drop"))
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
        if(PermManager.hasPermission(player, "dropall"))
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


/////////////////////////////////////////////////////////////////////////////////////
//                                      Main                                       //
/////////////////////////////////////////////////////////////////////////////////////

function main()
{
    ll.registerPlugin(
        /* name */ "LLSE-FakePlayer",
        /* introduction */ "A strong fake-player plugin for LiteLoaderBDS",
        /* version */ _VER,
        /* otherInformation */ {"Author": "yqs112358"}
    ); 

    InitConfigFile();
    logger.setLogLevel(GlobalConf.get("LogLevel", 4));
    PermManager.initPermManager();
    logger.info(`LLSE-FakePlayer ${_VER} loaded. Author：yqs112358`);

    FakePlayerManager.loadAllFpData();
    //logger.debug("FpList: ", FakePlayerManager.fpList);

    mc.listen("onTick", FakePlayerManager.onTick);
    mc.listen("onPlayerDie", FakePlayerManager.onPlayerDie);
    mc.listen("onServerStarted", () =>
    {
        // command registry
        RegisterCmd(PermManager.userMode);

        // auto reconnect
        let res = FakePlayerManager.initialAutoOnline();
        if(res != SUCCESS)
        {
            logger.warn("Some errors occur at auto-reconnect:\n" + res);
        }
    });
}

main();