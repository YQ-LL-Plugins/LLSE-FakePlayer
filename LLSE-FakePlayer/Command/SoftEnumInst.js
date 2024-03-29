export class SoftEnumInst
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

    getValues()
    {
        return this._cmdObj.getSoftEnumValues(this._name);
    }

    exists(item)
    {
        return (item in this.getValues());
    }

    getName()
    {
        return this._name;
    }
}