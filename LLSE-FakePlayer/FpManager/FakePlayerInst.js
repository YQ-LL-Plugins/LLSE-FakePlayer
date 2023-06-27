import { FakePlayerManager } from "../FpManager/FakePlayerManager.js";
import { EntityGetFeetPos } from "../Utils/Utils.js"


export class FakePlayerInst
{
/////////////////////////////////////////////////////////////////////////////////////
///                                 Private Data                                 ///
/////////////////////////////////////////////////////////////////////////////////////
    name = "";
    pos = null;
    ownerXuid = "";
    isonline = false;
    operation = "";
    opInterval = 0;
    opMaxTimes = 0;
    opLength = 0;
    syncXuid = "";

    _opTimeTask = null;
    _lastSyncPlayerPos = null;


/////////////////////////////////////////////////////////////////////////////////////
///                                 Private Logic                                 ///
/////////////////////////////////////////////////////////////////////////////////////

    static opCallback(thiz)
    {
        //logger.debug("op start");
        return function() {
            if(thiz.operation == "" || !thiz.isonline)
                return;
            let pl = thiz.getPlayer();
            if(!pl)
                return;

            let isLongOperation = false;
            switch(thiz.operation)
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
                thiz._opTimeTask = setTimeout(FakePlayerInst.opReachLength(thiz), thiz.opLength);
            else
            {
                // check max times
                if(thiz.opMaxTimes > 0)
                {
                    --thiz.opMaxTimes;
                    if(thiz.opMaxTimes == 0)
                    {
                        thiz.clearOperation();
                        return;
                    }
                }
                thiz._opTimeTask = setTimeout(FakePlayerInst.opCallback(thiz), thiz.opInterval);
            }
        };
    }

    static opReachLength(thiz)
    {
        //logger.debug("op reach length");
        return function() {
            if(thiz.operation == "" || !thiz.isonline)
                return;
            let pl = thiz.getPlayer();
            if(!pl)
                return;

            switch(thiz.operation)
            {
            case "useitem":
                pl.simulateStopUsingItem();
                break;
            }

            // check max times
            if(thiz.opMaxTimes > 0)
            {
                --thiz.opMaxTimes;
                if(thiz.opMaxTimes == 0)
                {
                    thiz.clearOperation();
                    return;
                }
            }
            thiz._opTimeTask = setTimeout(FakePlayerInst.opCallback(thiz), thiz.opInterval);
        };
    }

    tickLoop()
    {
        // sync
        if(this.syncXuid != "")
        {
            let pl = this.getPlayer();
            if(!pl)
                return;

            let targetPlayer = mc.getPlayer(this.syncXuid);
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
                        this.pos.x = newPos.x;
                        this.pos.y = newPos.y;
                        this.pos.z = newPos.z;
                        this.pos.dimid = newPos.dimid;
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
                            this.pos.x += dx;
                            this.pos.y += dy;
                            this.pos.z += dz;
                            this.pos.dimid = newPos.dimid;
                            let newTarget = new FloatPos(this.pos.x, this.pos.y, this.pos.z, this.pos.dimid);
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



/////////////////////////////////////////////////////////////////////////////////////
///                                 Help Functions                                ///
/////////////////////////////////////////////////////////////////////////////////////

    getPlayer()
    {
        let pl = mc.getPlayer(this.name);
        if(!pl || !pl.isSimulatedPlayer())
            return null;
        return pl;
    }
    setPos(x, y, z, dimid)
    {
        this.pos.x = x;
        this.pos.y = y;
        this.pos.z = z;
        this.pos.dimid = dimid;
    }
    getPos()        // return {x:x, y:y, z:z, dimid:dimid}
    {
        return this.pos;
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
    isNeedTick()
    {
        return this.syncXuid != "";
    }
    isOnline()
    {
        return this.isonline != 0;
    }
    getOwnerXuid()
    {
        return this.ownerXuid;
    }


/////////////////////////////////////////////////////////////////////////////////////
///                            Fp Data and Inventory                              ///
/////////////////////////////////////////////////////////////////////////////////////

    serializeFpData()
    {
        return {
            '_name': this.name,
            '_pos': this.pos,
            '_isOnline': this.isonline,
            '_operation': this.operation,
            '_opInterval': this.opInterval,
            '_opMaxTimes': this.opMaxTimes,
            '_opLength': this.opLength,
            '_syncXuid': this.syncXuid,
            '_ownerXuid': this.ownerXuid
        };
    }
    static recoverFpData(fpName, fpData)
    {
        if(fpName != fpData._name)
            throw Error("Bad fpdata file content");

        let ownerXuid = fpData._ownerXuid ? fpData._ownerXuid : "";
        return new FakePlayerInst(
            fpData._name, fpData._pos, fpData._operation, fpData._opInterval, 
            fpData._opMaxTimes, fpData._opLength, fpData._syncXuid, fpData._isonline, ownerXuid);
    }
    // return SNBT string of all items
    serializeAllItems()
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
    // return true/false
    recoverAllItems(snbtStr)
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


/////////////////////////////////////////////////////////////////////////////////////
///                               Public Functions                                ///
/////////////////////////////////////////////////////////////////////////////////////

    constructor(name, pos, operation = "", opInterval = 1000, opMaxTimes = 1, opLength = 1000, syncXuid = "", isonline = false,
        ownerXuid = "")
    {
        this.name = name;
        this.pos = pos;
        this.ownerXuid = ownerXuid;
        this.isonline = isonline;

        this.operation = operation;
        this.opInterval = opInterval;
        this.opMaxTimes = opMaxTimes;
        this.opLength = opLength;
        this._opTimeTask = null;        // private

        this.syncXuid = syncXuid;
        this._lastSyncPlayerPos = null;     // private
    }
    // return all info object
    getAllInfo()
    {
        return {
            'name': this.name, 'pos': this.pos, 'ownerXuid': this.ownerXuid, 'isOnline': this.isonline,
            'operation': this.operation, 'opInterval': this.opInterval, 'opMaxTimes': this.opMaxTimes, 
            'opLegnth': this.opLength, 'syncXuid': this.syncXuid
        };
    }
    // return true / false
    online()
    {
        if(mc.getPlayer(this.name) != null)
            return true;

        // Create simulated player
        let posData = this.pos;
        let spawnPos = new FloatPos(eval(posData.x), eval(posData.y), eval(posData.z), eval(posData.dimid));
        let pl = mc.spawnSimulatedPlayer(this.name, spawnPos);
        if(!pl)
            return false;
        this.isonline = true;

        // Teleport to target pos again
        if(!pl.teleport(spawnPos))
            return false;

        // Start operation loop if needed
        if(this.operation != "")
            this.startOperationLoop();
        return true;
    }
    // return true / false
    offline()
    {
        if(!this.isOnline())
            return true;
        let pl = this.getPlayer();
        if(!pl)
            return false;
        this.stopOperationLoop();
        let success = pl.simulateDisconnect();
        if(!success)
            return false;
        this.isonline = false;
        return true;
    }
    // always success
    startOperationLoop()
    {
        FakePlayerInst.opCallback(this)();        // operate once immediately
    }
    // always success
    stopOperationLoop()
    {
        if(this._opTimeTask)
        {
            clearInterval(this._opTimeTask);
            this._opTimeTask = null;
        }
    }
    // always success
    setShortOperation(operation, opInterval = 1000, opMaxTimes = 1)
    {
        this.stopOperationLoop();
        this.operation = operation;
        this.opInterval = opInterval;
        this.opMaxTimes = opMaxTimes;
        this.startOperationLoop();
        FakePlayerManager.saveFpData(this.name);
    }
    // always success
    setLongOperation(operation, opInterval = 1000, opMaxTimes = 1, opLength = 1000)
    {
        this.stopOperationLoop();
        this.operation = operation;
        this.opInterval = opInterval;
        this.opMaxTimes = opMaxTimes;
        this.opLength = opLength;
        this.startOperationLoop();
        FakePlayerManager.saveFpData(this.name);
    }
    // always success
    clearOperation()
    {
        this.stopOperationLoop();
        let pl = this.getPlayer();
        if(pl)
        {
            switch(this.operation)
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
        this.operation = "";
        FakePlayerManager.saveFpData(this.name);
    }
    // always success
    startSync(targetXuid)
    {
        this.syncXuid = targetXuid;
    }
    // always success
    stopSync()
    {
        this.syncXuid = "";
        this._lastSyncPlayerPos = null;
    }
}