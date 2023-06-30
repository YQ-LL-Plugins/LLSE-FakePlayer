// Pre-defined paths and dirs
const _CONFIG_PATH = "./plugins/LLSE-FakePlayer/config.json";
const _FP_DATA_DIR = "./plugins/LLSE-FakePlayer/fpdata/";
const _FP_INVENTORY_DIR = "./plugins/LLSE-FakePlayer/fpinventorys/";
const _FP_PERMISSION_DIR = "./plugins/LLSE-FakePlayer/fppermissions/";
const _I18N_DIR = "./plugins/LLSE-FakePlayer/LangPack";

// Pre-defined global consts
const _DEFAULT_PLAYER_SELECT_SLOT = 0;
const SUCCESS = "";
const _LONG_OPERATIONS_LIST = ["useitem"];
const _SHORT_OPERATIONS_LIST = ["attack", "interact"/*, "destroy", "place" */, "clear"];
let _VALID_DIMENSION_NAMES = [];

// Exports
export {
    _CONFIG_PATH, _FP_DATA_DIR, _FP_INVENTORY_DIR, _FP_PERMISSION_DIR, _I18N_DIR,
    _DEFAULT_PLAYER_SELECT_SLOT, SUCCESS, _LONG_OPERATIONS_LIST, _SHORT_OPERATIONS_LIST,
    _VALID_DIMENSION_NAMES
};

export function InitGlobalVars()
{
    _VALID_DIMENSION_NAMES = [
        i18n.tr("dimension.name.mainworld"), 
        i18n.tr("dimension.name.nether"), 
        i18n.tr("dimension.name.end")
    ];
}