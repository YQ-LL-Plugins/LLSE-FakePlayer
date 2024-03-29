// LiteLoader-AIDS automatic generated
/// <reference path="c:\Users\yqs11\Desktop\Projects\Game\Minecraft\LLSE-Aids-Library/dts/helperlib/src/index.d.ts"/> 


const _VER = [2, 0, 1];

import { 
    _I18N_DIR,
    InitGlobalVars,
    SUCCESS
} from "./plugins/LLSE-FakePlayer/Utils/GlobalVars.js";

import { GlobalConf, InitConfigFile } from "./plugins/LLSE-FakePlayer/Utils/ConfigFileHelper.js";
import { PermManager } from "./plugins/LLSE-FakePlayer/Utils/PermManager.js";
import { ExportFakePlayerAPIs, FakePlayerManager } from "./plugins/LLSE-FakePlayer/FpManager/FakePlayerManager.js";
import { RegisterCmd, PlayerListSoftEnum } from "./plugins/LLSE-FakePlayer/Command/CommandRegistry.js";

function InitI18n()
{
    let lang = GlobalConf.get("Language", "default");
    if(lang == "default")
        lang = "";
    i18n.load(_I18N_DIR, lang);
}

function main()
{
    InitConfigFile();
    InitI18n();
    InitGlobalVars();

    ll.registerPlugin(
        /* name */ "LLSE-FakePlayer",
        /* introduction */ "A strong fake-player plugin for LiteLoaderBDS",
        /* version */ _VER,
        /* otherInformation */ {"Author": "yqs112358"}
    ); 

    logger.setLogLevel(GlobalConf.get("LogLevel", 4));
    FakePlayerManager.loadAllFpData();
    PermManager.initPermManager();
    //logger.debug("FpList: ", FakePlayerManager.fpList);

    mc.listen("onTick", FakePlayerManager.onTick);
    mc.listen("onPlayerDie", FakePlayerManager.onPlayerDie);
    mc.listen("onJoin", (pl) => {
        if(!pl.isSimulatedPlayer())
            PlayerListSoftEnum.add(pl.realName);
    });
    mc.listen("onLeft", (pl) => {
        if(!pl.isSimulatedPlayer())
            PlayerListSoftEnum.remove(pl.realName);
    });
    mc.listen("onServerStarted", () =>
    {
        // command registry
        RegisterCmd();

        // auto reconnect
        let res = FakePlayerManager.initialAutoOnline();
        if(res != SUCCESS)
        {
            logger.warn(i18n.tr("main.autoreconnect.error") + "\n" + res);
        }
    });

    ExportFakePlayerAPIs();
    logger.info(i18n.tr("main.welcome", "v" + _VER.join(".")));
}

main();