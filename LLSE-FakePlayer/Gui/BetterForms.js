// wrapper for SimpleForm for easier routing
export class BetterSimpleForm
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
export class BetterCustomFormResult
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

export class BetterCustomForm
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