import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";
import { EntityGetFeetPos } from "../Utils/Utils.js"

export class FakePlayerInst
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