import { _VALID_DIMENSION_NAMES, _VALID_GAMEMODE_NAMES } from "../Utils/GlobalVars.js"

export function CalcPosFromViewDirection(oldPos, nowDirection, distance)
{
    let yaw = (nowDirection.yaw + 180) / 180 * Math.PI;
    let vector = [Math.sin(yaw) * distance, 0, -Math.cos(yaw) * distance];
    return new FloatPos(oldPos.x + vector[0], oldPos.y, oldPos.z + vector[2], oldPos.dimid);
}

export function IsNumberInt(num)
{
    return num % 1 == 0;
}

export function IsValidDimId(dimid)
{
    return IsNumberInt(dimid) && dimid >= 0 && dimid <= _VALID_DIMENSION_NAMES.length - 1;
}

// parse "x y z", return {x:x, y:y, z:z} / null
export function ParsePositionString(posStr)
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

export function EntityGetFeetPos(entity)
{
    let feetPos = entity.feetPos;
    if(!feetPos)
    {
        feetPos = entity.pos;
        feetPos.y -= 1.62;
    }
    return feetPos;
}

export function GetGameModeName(mode)
{
    let name = _VALID_GAMEMODE_NAMES[`${mode}`];
    // logger.debug(`${mode} -> ${name}`);
    if(name == null || name == undefined)
        name = i18n.tr("gameMode.name.default");
    return name;
}