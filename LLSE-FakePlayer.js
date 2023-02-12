//LiteLoaderScript Dev Helper
/// <reference path="c:\Users\yqs11\Desktop\Projects\Game\Minecraft\LLSE-Aids-Library/dts/HelperLib-master/src/index.d.ts"/> 

const _VER = [1,0,0];
const _CONFIG_PATH = "./plugins/LLSE-FakePlayer/config.ini";
const _FP_DATA_DIR = "./plugins/LLSE-FakePlayer/fpdata/";
const _FP_INVENTORY_DIR = "./plugins/LLSE-FakePlayer/fpinventorys/";


/////////////////////////////////////////////////////////////////////////////////////
//                                     Helpers                                     //
/////////////////////////////////////////////////////////////////////////////////////

const _DEFAULT_PLAYER_SELECT_SLOT = 0;
function CalcPosFromViewDirection(oldPos, nowDirection, distance)
{
    let yaw = (nowDirection.yaw + 180) / 180 * Math.PI;
    let vector = [Math.sin(yaw) * distance, 0, -Math.cos(yaw) * distance];
    return new FloatPos(oldPos.x + vector[0], oldPos.y, oldPos.z + vector[2], oldPos.dimid);
}

function IsValidDimId(dimid)
{
    return dimid % 1 == 0 && dimid >= 0 && dimid <= 2;
}


/////////////////////////////////////////////////////////////////////////////////////
//                            FakePlayer Instance Class                            //
/////////////////////////////////////////////////////////////////////////////////////

class FakePlayerInst
{
///////// private
    static opCallback(thiz)
    {
        logger.debug("op start");
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
        logger.debug("op reach length");
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
                    this._lastSyncPlayerPos = targetPlayer.pos;
                else
                {
                    let oldPos = this._lastSyncPlayerPos;
                    let newPos = targetPlayer.pos;
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
            this.setPos(pl.pos.x, pl.pos.y, pl.pos.z, pl.pos.dimid);
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

const SUCCESS = "";

class FakePlayerManager
{
//////// private
    static fpList = {};
    static needTickFpList = {}

    static onTick()
    {
        for(let key in FakePlayerManager.needTickFpList)
        {
            FakePlayerManager.needTickFpList[key].tickLoop();
        }
    }

//////// public
    static online(fpName, failIfOnline = true)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(failIfOnline && fp.isOnline())
            return `§6${fpName}§r is online now`;
        if(!fp.online())
            return `Fail to online §6${fpName}§r`;
        if(fp.isNeedTick())
            FakePlayerManager.needTickFpList[fpName] = fp;
        FakePlayerManager.saveFpData(fpName);
        FakePlayerManager.loadInventoryData(fpName);
        return SUCCESS;
    }

    static offline(fpName, failIfOffline = true)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(failIfOffline && !fp.isOnline())
            return `§6${fpName}§r is offline now`;

        if(fpName in FakePlayerManager.needTickFpList)
            delete FakePlayerManager.needTickFpList[fpName];
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);

        fp.updatePos();
        if(!fp.offline())
            return `Fail to offline §6${fpName}§r`;
        FakePlayerManager.saveFpData(fpName, false);
        return SUCCESS;
    }

    // return ["fail result", ["aaa", "bbb", ...]] / [SUCCESS, ["aaa", "bbb", ...]]
    static onlineAll()
    {
        let resultStr = "";
        let successNames = [];
        for(let fpName of Object.keys(FakePlayerManager.fpList))
        {
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
        for(let fpName of Object.keys(FakePlayerManager.fpList))
        {
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
        if(fpName in FakePlayerManager.fpList)
            return `§6${fpName}§r exists. Use "/fpc online ${fpName}" to online it`;
        FakePlayerManager.fpList[fpName] = new FakePlayerInst(fpName, {'x':x.toFixed(2), 'y':y.toFixed(2), 'z':z.toFixed(2), 'dimid':dimid});
        FpListSoftEnum.add(fpName);
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    static remove(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        if(FakePlayerManager.fpList[fpName].isOnline())
        {
            FakePlayerManager.offline(fpName, false);
        }
        delete FakePlayerManager.fpList[fpName];

        if(fpName in FakePlayerManager.needTickFpList)
            delete FakePlayerManager.needTickFpList[fpName];
        FpListSoftEnum.remove(fpName);
        FakePlayerManager.deleteFpData(fpName);
        FakePlayerManager.deleteInventoryData(fpName);
        return SUCCESS;
    }

    // return [SUCCESS, ["aaa", "bbb", ...] ]
    static list()
    {
        return [SUCCESS, Object.keys(FakePlayerManager.fpList)];
    }

    // return ["fail message", null] / [SUCCESS, {xxx:xxx, ...}]
    static getAllInfo(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return [`§6${fpName}§r no found. Please create it first.`, null];
        let fp = FakePlayerManager.fpList[fpName];
        return [SUCCESS, fp.getAllInfo()];
    }

    // return ["fail message", null] / [SUCCESS, {xxx:xxx, ...}]
    static getPosition(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return [`§6${fpName}§r no found. Please create it first.`, null];
        let fp = FakePlayerManager.fpList[fpName];
        return [SUCCESS, fp.getPos()];
    }

    // return ["fail message", null] / [SUCCESS, true / false]
    static isOnline(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return [`§6${fpName}§r no found. Please create it first.`, null];
        let fp = FakePlayerManager.fpList[fpName];
        return [SUCCESS, fp.isOnline()];
    }

    static setShortOperation(fpName, operation, opInterval, opMaxTimes)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];

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
            fp.setShortOperation(operation, opInterval, opMaxTimes);
        }
        return SUCCESS;
    }

    static setLongOperation(fpName, operation, opInterval, opMaxTimes, opLength)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];

        if(!opInterval)
            opInterval = 1000;
        if(!opMaxTimes)
            opMaxTimes = 1;
        if(!opLength)
            opLength = 1000;
        fp.setLongOperation(operation, opInterval, opMaxTimes, opLength);
        return SUCCESS;
    }

    // return ["fail reason", null] / [SUCCESS, {isFullPath:Boolean, path:Number[3][]} ]
    static walkToPos(fpName, pos)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return [`§6${fpName}§r no found. Please create it first.`, null];
        
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return [`Fail to get fakeplayer §6${fpName}§r`, null];
        let res = pl.simulateNavigateTo(pos);
        if(!res)
            return [`Fail to navigate to target`, null];
        
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
            return ["Target entity is invalid", null];
        if(!(fpName in FakePlayerManager.fpList))
            return [`§6${fpName}§r no found. Please create it first.`, null];
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return [`Fail to get fakeplayer §6${fpName}§r`, null];
        let res = pl.simulateNavigateTo(entity.pos);
        if(!res)
            return [`Fail to navigate to target`, null];
        
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
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return `Fail to get fakeplayer §6${fpName}§r`;
        if(!pl.teleport(pos))
            return `Fail to teleport fakeplayer §6${fpName}§r`;
        
        fp.setPos(pos.x, pos.y, pos.z, pos.dimid);
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    static teleportToEntity(fpName, entity)
    {
        if(!entity)
            return "Target entity is invalid";
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return `Fail to get fakeplayer §6${fpName}§r`;
        let pos = entity.pos;
        if(!pl.teleport(pos))
            return `Fail to teleport fakeplayer §6${fpName}§r`;
        
        fp.setPos(pos.x, pos.y, pos.z, pos.dimid);
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    static giveItem(fpName, player)
    {
        if(!player)
            return "Target player is invalid";
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return `Fail to get fakeplayer §6${fpName}§r`;

        let itemOld = player.getHand();
        if(itemOld.isNull())
            return SUCCESS;
        let itemNew = itemOld.clone();
        let inventory = pl.getInventory();
        // check inventory has room
        if(inventory.hasRoomFor(itemNew))
        {
            if(!inventory.addItem(itemNew))
                return `Fail to give item to §6${fpName}§r`;
        }
        else
        {
            // drop out hand first
            result = FakePlayerManager.dropItem(fpName, _DEFAULT_PLAYER_SELECT_SLOT);
            if(result != SUCCESS)
                return "Fail to make space for new item: " + result;
            if(!inventory.addItem(itemNew))
                return `Fail to give item to §6${fpName}§r`;
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
        if(!(fpName in FakePlayerManager.fpList))
            return [`§6${fpName}§r no found. Please create it first.`, null];
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return [`Fail to get fakeplayer §6${fpName}§r`, null];
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
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return `Fail to get fakeplayer §6${fpName}§r`;

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
                return `Fail to clear old item of §6${fpName}§r`;
        }
        else
        {
            let itemOldClone = itemOld.clone();
            if(!inventory.setItem(oldSlotId, itemNew.clone()))
                return `Fail to clear old item of §6${fpName}§r`;
            if(!inventory.setItem(slotId, itemOldClone))
                return `Fail to set new item of §6${fpName}§r`;
        }
        pl.refreshItems();
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return SUCCESS;
    }

    static dropItem(fpName, slotId)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return `Fail to get fakeplayer §6${fpName}§r`;

        if(!slotId)
            slotId = _DEFAULT_PLAYER_SELECT_SLOT;
        let inventory = pl.getInventory();
        let item = inventory.getItem(slotId);
        if(item.isNull())
            return `Slot ${slotId} has no item to drop`;
        // spawn dropped item at 2 blocks away
        if(!mc.spawnItem(item.clone(), CalcPosFromViewDirection(pl.pos, pl.direction, 2)))
            return `Fail to drop item`;
        if(!inventory.removeItem(slotId, item.count))
            return "Fail to remove item from fakeplayer's inventory";
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return SUCCESS;
    }

    static dropAllItems(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        let pl = fp.getPlayer();
        if(!pl)
            return `Fail to get fakeplayer §6${fpName}§r`;
        
        let inventory = pl.getInventory();
        let size = inventory.size;

        let resultStr = "";
        for(let slotId=0; slotId < size; ++slotId)
        {
            let item = inventory.getItem(slotId);
            if(item.isNull())
                continue;
            // spawn dropped item at 2 blocks away
            if(!mc.spawnItem(item.clone(), CalcPosFromViewDirection(pl.pos, pl.direction, 2)))
                resultStr += `Fail to drop item at slot ${slotId}\n`;
            if(!inventory.removeItem(slotId, item.count))
                resultStr += `Fail to remove item from slot ${slotId}\n`;
        }
        if(!FakePlayerManager.saveInventoryData(fpName))
            logger.warn(`Fail to save inventory of ${fpName}`);
        return resultStr == "" ? SUCCESS : resultStr.substring(0, resultStr.length - 1);
    }

    static startSync(fpName, player)
    {
        if(!player)
            return "Target player is invalid";
        if(player.isSimulatedPlayer())
            return "Cannot sync with a fakeplayer";
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        fp.startSync(player.xuid);

        FakePlayerManager.needTickFpList[fpName] = fp;
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    static stopSync(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return `§6${fpName}§r no found. Please create it first.`;
        let fp = FakePlayerManager.fpList[fpName];
        if(!fp.isOnline())
            return `§6${fpName}§r is offline now`;
        fp.stopSync();

        let pl = fp.getPlayer();
        if(pl)
            pl.simulateStopMoving();

        if(fpName in FakePlayerManager.needTickFpList)
            delete FakePlayerManager.needTickFpList[fpName];
        FakePlayerManager.saveFpData(fpName);
        return SUCCESS;
    }

    // return ["SUCCESS", "Help text"]
    static getHelp()
    {
        return [SUCCESS, "[LLSE-FakePlayer Help]"];
    }

    // User management
    static addAdmin(name)
    {

    }

    static removeAdmin(name)
    {

    }

    static addUser(name)
    {

    }

    static removeUser(name)
    {
        
    }

    static banUser(name)
    {
        
    }

    static unbanUser(name)
    {
        
    }

    // return true / false
    static saveFpData(fpName, updatePos = true)
    {
        let fp = FakePlayerManager.fpList[fpName];
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
    
                FakePlayerManager.fpList[fpName] = new FakePlayerInst(
                    fpData._name, fpData._pos, fpData._operation, fpData._opInterval, 
                    fpData._opMaxTimes, fpData._opLength, fpData._syncXuid, fpData._isOnline);
            }
            return true;
        }
    }

    // return true / false
    static saveInventoryData(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return false;
        let fp = FakePlayerManager.fpList[fpName];
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
        if(!(fpName in FakePlayerManager.fpList))
            return false;
        let fp = FakePlayerManager.fpList[fpName];
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
        for(let fpName in FakePlayerManager.fpList)
        {
            // if fp is online at shutdown, recover him
            if(FakePlayerManager.fpList[fpName].isOnline())
            {
                let res = FakePlayerManager.online(fpName, false);
                if(res != SUCCESS)
                    resultStr += res + "\n";
            }
        }
        return resultStr == "" ? SUCCESS : resultStr.substring(0, resultStr.length - 1);
    }

    // return Player / null
    static getPlayer(fpName)
    {
        if(!(fpName in FakePlayerManager.fpList))
            return null;
        return FakePlayerManager.fpList[fpName].getPlayer();
    }
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
//                                 Command Process                                 //
/////////////////////////////////////////////////////////////////////////////////////

function cmdCallback(_cmd, ori, out, res)
{
    let result;
    switch(res.action)
    {
    case "online":
        result = FakePlayerManager.online(res.fpname);
        if (result == SUCCESS)
            out.success(`[FakePlayer] §6${res.fpname}§r is online`);
        else
            out.error("[FakePlayer] " + result);
        break;
    case "offline":
        result = FakePlayerManager.offline(res.fpname);
        if(result == SUCCESS)
            out.success(`[FakePlayer] §6${res.fpname}§r is offline`);
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
                out.success("[FakePlayer] All fakeplayers are online:\n" + namesList);
            else
                out.error("[FakePlayer] " + result + "\nThese fakeplayers are online now:\n" + namesList);
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
                out.success("[FakePlayer] All fakeplayers are offline:\n" + namesList);
            else
                out.error("[FakePlayer] " + result + "\nThese fakeplayers are offline now:\n" + namesList);
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
                    out.error(`[FakePlayer] ${dimid} is not a valid dimension id.`);
                    break;
                }
                spawnPos.dimid = dimid;
            }
            else if(ori.player)
                spawnPos.dimid = ori.player.pos.dimid;
            else
            {
                out.error(`[FakePlayer] You must give a valid dimension id for fakeplayer to create.`);
                break;
            }
        }
        else if(ori.player)
        {
            // createpos not set, but executed by player
            spawnPos = CalcPosFromViewDirection(ori.player.pos, ori.player.direction, 2);
        }
        else
        {
            out.error(`[FakePlayer] You must give a valid position for fakeplayer to create.`);
            break;
        }

        result = FakePlayerManager.createNew(fpName, spawnPos.x, spawnPos.y, spawnPos.z, spawnPos.dimid);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }
        result = FakePlayerManager.online(fpName);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }

        // teleport to target pos
        result = FakePlayerManager.teleportToPos(fpName, spawnPos);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] §6${fpName}§r created, but " + result);
            break;
        }
        out.success(`[FakePlayer] §6${fpName}§r created`);
        break;
    }
    case "remove":
        result = FakePlayerManager.remove(res.fpname);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] §6${res.fpname}§r removed`);
        break;
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
                    out.success(`[FakePlayer] ${result.length} fakeplayers in all:\n${namesStr}`);
                }
                else
                    out.success(`[FakePlayer] No fakeplayers now.`);
            }
            else
            {
                // get info of a specific fp
                let resultData = FakePlayerManager.getAllInfo(fpName);
                if(resultData[0] != SUCCESS)
                    out.error(`[FakePlayer] ` + resData[0]);

                let result = resultData[1];
                let posObj = new FloatPos(eval(result.pos.x), eval(result.pos.y), eval(result.pos.z), eval(result.pos.dimid));
                let syncPlayerName = data.xuid2name(result.syncXuid);
                out.success(`[FakePlayer] §6${fpName}§r:\n`
                    + `- Position: ${posObj.toString()}\n`
                    + `- Operation: ${result.operation ? result.operation : "None"}\n`
                    + `- Sync Target Player: ${syncPlayerName ? syncPlayerName : "None"}\n`
                    + `- Status: ${result.isOnline ? "Online" : "Offline"}`
                );
            }
        }
        break;
    case "operation":
        if(res.optype)
        {
            // short op type
            result = FakePlayerManager.setShortOperation(res.fpname, res.optype, res.interval, res.maxtimes);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            if(res.optype == "clear")
                out.success(`[FakePlayer] §6${res.fpname}§r operation cleared.`);
            else
                out.success(`[FakePlayer] §6${res.fpname}§r set to ${res.optype}`);
        }
        else
        {
            // long op type
            result = FakePlayerManager.setLongOperation(res.fpname, res.longoptype, res.interval, res.maxtimes, res.length);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] §6${res.fpname}§r set to ${res.longoptype}`);
        }
        break;
    case "walkto":
        logger.debug(res.player);
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
                out.success(`[FakePlayer] Target set. Walking to target player ${target.name}...`);
            else
            {
                let fpPos = FakePlayerManager.getPosition(res.fpname)[1];
                let dimid = fpPos ? fpPos.dimid : target.pos.dimid;

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] Cannot reach the target given. The path will end at ${lastPathPoint.toString()}.`
                    +` Walking to the end position...`);
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
                out.success(`[FakePlayer] Target set. Walking to target position ${res.targetpos}...`);
            else
            {
                let fpPos = FakePlayerManager.getPosition(res.fpname)[1];
                let dimid = fpPos ? fpPos.dimid : 0;        // if cannot get dimid, guess that is 0

                let lastData = data.path[data.path.length - 1];
                let lastPathPoint = new IntPos(eval(lastData[0]), eval(lastData[1]), eval(lastData[2]), dimid);
                out.success(`[FakePlayer] Cannot reach the target given. The path will end at ${lastPathPoint.toString()}.`
                    +` Walking to the end position...`);
            }
        }
        else
            out.error(`[FakePlayer] Bad target position`)
        break;
    case "tp":
        logger.debug(res.player);
        if((res.player instanceof Array) && res.player != [])
        {
            let target = res.player[0];
            result = FakePlayerManager.teleportToEntity(res.fpname, target);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] §6${res.fpname}§r teleported to ${target.name}`);
        }
        else if (res.targetpos)
        {
            result = FakePlayerManager.teleportToPos(res.fpname, res.targetpos);
            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }  
            out.success(`[FakePlayer] §6${res.fpname}§r teleported to ${res.targetpos}`);
        }
        else
            out.error(`[FakePlayer] Bad target position`)
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
            out.success(`[FakePlayer] Item given to §6${res.fpname}§r`);
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
            let resStr = `[FakePlayer] Inventory of §6${res.fpname}§r:\n`;

            // hand
            let item = data.Hand;
            if(item)
                resStr += `§3[Hand]§r §6${item.name}§2[${item.count}]§r\n`;
            else
                resStr += `§3[Hand]§r None\n`;
            
            // offhand
            item = data.OffHand;
            if(item)
                resStr += `§3[Offhand]§r §6${item.name}§2[${item.count}]§r\n`;
            else
                resStr += `§3[Offhand]§r None\n`;
            
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
                resStr += "§3[Inventory]§r None\n";
            else
                resStr += "§3[Inventory]§r\n" + inventoryStr + "\n";
            
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
                resStr += "§3[Armor]§r None\n";
            else
                resStr += "§3[Armor]§r\n" + armorStr + "\n";
            
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
        out.success(`[FakePlayer] §6${res.fpname}§r dropped item`);
        break;
    case "dropall":
        result = FakePlayerManager.dropAllItems(res.fpname);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] §6${res.fpname}§r dropped all items`);
        break;
    case "setselect":
        result = FakePlayerManager.setSelectSlot(res.fpname, res.slotid);
        if(result != SUCCESS)
        {
            out.error("[FakePlayer] " + result);
            break;
        }  
        out.success(`[FakePlayer] Select slot changed to ${res.slotid}`);
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
                out.error(`[FakePlayer] Unknown action: ${res.synctype}`);
                break;
            }

            if(result != SUCCESS)
            {
                out.error("[FakePlayer] " + result);
                break;
            }
            if(res.synctype == "start")
                out.success(`[FakePlayer] Sync of §6${res.fpname}§r started. `
                    + `Use "/fpc sync stop" to stop.`);
            else
                out.success(`[FakePlayer] Sync of §6${res.fpname}§r stopped.`);
        }
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
        result = FakePlayerManager.getHelp()[1];
        out.success("[FakePlayer] " + result);
        break;
    
    default:
        out.error(`[FakePlayer] Unknown action: ${res.action}`);
    }
    return true;
}


/////////////////////////////////////////////////////////////////////////////////////
//                                Command Registry                                 //
/////////////////////////////////////////////////////////////////////////////////////

function RegisterCmd(userMode)      // whitelist / blacklist
{
    let fpCmd = mc.newCommand("fakeplayercontrol", "§6LLSE-FakePlayer Control§r", PermType.Any, 0x80);
    fpCmd.setAlias("fpc");

    // create soft enum
    FpListSoftEnum = new SoftEnumInst(fpCmd, "FakePlayerList", Object.keys(FakePlayerManager.fpList));

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

    // fpc operation <fpname> attack/interact/clear [interval] [maxtimes]
    fpCmd.setEnum("OperationAction", ["operation"]);
    fpCmd.setEnum("ShortOperationType", ["attack", "interact", "clear"]);
    fpCmd.mandatory("action", ParamType.Enum, "OperationAction", "OperationAction", 1);
    fpCmd.mandatory("optype", ParamType.Enum, "ShortOperationType", "ShortOperationType", 1);
    fpCmd.optional("interval", ParamType.Int);
    fpCmd.optional("maxtimes", ParamType.Int);
    fpCmd.overload(["OperationAction", "fpname", "ShortOperationType", "interval", "maxtimes"]);
    // fpname created before

    // fpc operation <fpname> useitem [length] [interval] [maxtimes]
    fpCmd.setEnum("LongOperationType", ["useitem"]);
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

    logger.setLogLevel(5);
    logger.info(`LLSE-FakePlayer ${_VER} 已加载，开发者：yqs112358`);

    FakePlayerManager.loadAllFpData();
    //logger.debug("FpList: ", FakePlayerManager.fpList);

    mc.listen("onTick", FakePlayerManager.onTick);
    mc.listen("onServerStarted", () =>
    {
        // command registry
        RegisterCmd("whitelist");

        // auto reconnect
        let res = FakePlayerManager.initialAutoOnline();
        if(res != SUCCESS)
        {
            logger.warn("Some errors occur at auto-reconnect:\n" + res);
        }
    });
}

main();