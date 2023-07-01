# LLSE-FakePlayer

> A strong fake-player plugin for LiteLoaderBDS

## 安装

放置到`plugins`目录，开服即可

<br/>

## GUI

使用 `/fpc gui` 命令打开GUI管理界面进行管理，适合普通玩家和新手使用

## 命令

所有命令示例中，<>包括的为必选参数，[]包括的为可选参数

### 假人管理

- **假人上下线** 

  `/fpc online / offline <fpname>`

- **假人批量上下线** 

  `/fpc onlineall / offlineall`

  批量上 / 下线自己有权限操作的假人

- **创建假人**

  `/fpc create <name> [x] [y] [z] [dimid] [ownerName]`

  每个玩家拥有的假人数量有上限，在配置文件中设置（超级管理员玩家不受此限制）。创建者默认成为假人的所有者。

  当在控制台执行此命令时，必须填写ownerName项以指定假人的所有者，否则将无法创建。

- **删除假人**

  `/fpc remove <fpname>`

  玩家可以且仅可以删除自己拥有的假人（超级管理员玩家不受此限制）

- **列出所有假人**

  `/fpc list`
  
- **查看指定假人的详细信息**

  `/fpc list <fpname>`

### 假人行为控制

- **执行特定操作**

  `/fpc operation <fpname> attack / interact [interval] [maxtimes]`

  `/fpc operation <fpname> useitem [length] [interval] [maxtimes]`

  注意：operation的可选值：attack 攻击，interact 与方块互动，useitem 使用物品（destroy和place即将到来）

  interval表示执行间隔，length表示工作的长度（这里表示useitem右键按多久），两者单位均为ms（毫秒）

  maxtimes 为最大执行次数，如果设置为-1，表示无限次执行

- **行走到目标位置**

  `/fpc walkto <fpname> <x> <y> <z>`

  `/fpc walkto <fpname> <player>`

  即使无法到达目标位置，假人仍然会行走到离目标最近的点再结束

- **TP到目标位置**

  `/fpc tp <fpname> <x> <y> <z>`

  `/fpc tp <fpname> <player>`

- **将手中物品给予假人**

  `/fpc give <fpname> `

- **查看假人物品栏**

  `/fpc getinventory <fpname> `

- **设置假人主手选中物品**

  `/fpc setselect <fpname> <slotid>`

  此处slotid为`getinventory`操作返回的物品栏中的物品序号

- **扔出物品栏某格子物品**

  `/fpc drop <fpname> [slotid]`

- **扔出物品栏中所有物品**

  `/fpc dropall <fpname>`

- **和玩家同步行为**

  `/fpc sync <fpname> start / stop`

  同步身体朝向、视角、同步移动等

### 权限控制命令

- **授权假人的特定权限给某用户**

  `/fpc perm <fpname> add <actionname> <plname>`

- **撤销授权给某用户的权限**

  `/fpc perm <fpname> remove <actionname> <plname>`

- **将某用户设置为假人管理员**

  `/fpc perm <fpname> add admin <plname>`

- **撤销某用户的假人管理员**

  `/fpc perm <fpname> remove admin <plname>`

- **显示指定假人的所有授权信息**

  `/fpc perm <fpname> list`

- **将自己拥有的假人的所有权转移给他人**

  `/fpc perm <fpname> setowner <plname>`

相关机制解释详见下方 **系统权限管理机制** 小节

### 系统设置命令

- **设置玩家为超级管理员**

  `/fpc settings addsu <plname>`

- **撤销玩家的超级管理员身份**

  `/fpc settings removesu <plname>`

- **列出服务器中的所有超级管理员**

  `/fpc settings listsu`

- **将指定玩家加入黑名单/白名单**

  `/fpc settings ban/allow <plname>`

- **修改每个玩家所能拥有的假人数量上限**

  `/fpc settings maxfpcountlimit <limit>`

相关机制解释详见下方 **系统权限管理机制** 小节

### 其他命令

- **从其他假人工具导入数据**

  `/fpc import <path>`

  此功能尚未完成

- **获取帮助信息**

  `/fpc help`

<br/>

## 系统权限管理机制

在 LLSE-FakePlayer 2.0 版本中，权限系统进行了重大修改，以匹配各大服务器对权限管理、职责分配等的要求。

回顾一下旧设计：

> 系统分为 admin 和 user 两级用户机制。任何一个玩家属于admin或者user之一，admin拥有最高权限，user拥有部分权限，两者均可以操作所有假人。

旧方案存在较多问题，比如无法实现对特定假人权限的精细化管理、无法让普通玩家自由创建和操作假人、无法控制恶意创建假人等在内的行为等等。

### 新方案：基于所有权和特定授权的权限管理机制

#### 所有权机制

- 新的权限管理机制下，每一个假人拥有一个“所有者”
- 当玩家创建假人时，他将自动成为此假人的所有者。所有者对其拥有的假人拥有最高权限，可以执行任意操作。
- 玩家每人可以拥有的假人数量有上限，默认为3个。此项可以在配置文件中用`MaxFpCountLimitEach`项修改。
- 后续，可以通过 `/fpc perm <fpname> setowner <plname>` 命令将自己拥有的假人的所有权转移给其他玩家。

#### 特定授权机制

- 对特定假人的每一项操作，如`online` `offline` `operation ` `setselect`等等，都可以单独授权
- 假人“所有者”可以通过 `/fpc perm <fpname> add <actionname> <plname>`命令将特定的操作授权给指定用户
- 通过 `/fpc perm <fpname> remove <actionname> <plname>`命令撤销授权给指定用户的权限
  - 举例：我拥有假人`cxk`，想授权此假人的`sync`权限给另一个玩家`ikun`，可以执行以下命令：`/fpc perm cxk add sync ikun`来完成授权
  - 如果后续想撤销他的权限，执行以下命令：`/fpc perm cxk remove sync ikun`即可
- `<actionname>`的可选项有：`online, offline, operation, walkto, tp, give, getinventory, setselect, drop, dropall, sync, perm, admin（见下）`

#### 管理员机制

- 假人“所有者”可以通过 `/fpc perm <fpname> add admin <plname>`命令给当前假人设置一些管理员
- 可以通过 `/fpc perm <fpname> remove admin <plname>`命令撤销管理员的管理权限
  - 举例：我拥有假人`cxk`，想设置玩家`xiaoheizi`成为此假人的管理员，可以执行以下命令：`/fpc perm cxk add admin xiaoheizi`来完成设置
  - 如果想撤销管理员，执行`/fpc perm cxk remove admin xiaoheizi`即可
- 假人的管理员除了不能删除此假人之外，拥有和所有者一样的权限。管理员也可以将一些特定的操作授权给其他玩家。
- 假人的管理员名单只由假人“所有者”控制，假人管理员无法任免其他管理员。

#### 超级管理员玩家

- 系统拥有一些超级管理员玩家，称为`su`。`su`对整个假人系统拥有最高权限，可以对系统中的所有假人进行任何操作，无视所有的权限管理机制，也不受假人创建数量上限的限制。
- **默认情况下，服务器中的OP玩家会自动成为超级管理员** ，这样的设置是为了方便OP进行服务器管理。如果不想要此行为，可以去配置文件中关闭。
- 可以使用`/fpc settings addsu <plname>`命令设置指定玩家为超级管理员，使用`/fpc settings removesu <plname>`命令撤销指定玩家的超级管理员。这两条命令只能在BDS控制台中执行。

#### 黑名单 / 白名单机制

- 最后，可以针对性地对某些恶意用户设置黑名单，以禁止他们使用整个假人系统。
- 使用`/fpc settings ban <plname>`命令将玩家加入黑名单，使用`/fpc settings allow <plname>`命令将玩家移除出黑名单。此命令只能在BDS控制台中执行。
- 如果服务器打算对假人系统施行白名单机制，去配置文件中修改`UserMode`为`whitelist`即可。加入/移除白名单的命令与上面黑名单的顺序相反：`allow`用来将玩家加入白名单，`ban`用来将玩家移除出白名单。

<br/>

## F&Q

- **问：新的权限管理机制和旧的管理机制有什么区别？**
- 答：新设计解决了之前存在的管理员权限过大、难于管制恶意破坏、难于细分权限管理的问题。新的权限机制给假人增加了“所有者”概念，所有者对自己拥有的假人拥有所有权限，但未经授权的情况下不能操作其他人的假人。而为了方便协作和共用，又允许所有者共享部分权限给特定用户，或者设置管理员，实现 所有者 - 管理员 - 普通用户 的三级管理机制，以充分达到细分权限控制的目的。另外，保留了旧设计中的超管和黑白名单机制，为服务器管理提供便利。
- **问：从旧版LLSE-FakePlayer升级到2.0需要注意什么？**
- 答：由于旧版假人数据中并未记载“所有者”信息，因此升级到新版后，在对假人进行操作时会有“尚未拥有所有者”等警告提示出现，权限系统也暂时无法生效。让超管玩家或者BDS控制台执行`/fpc perm <假人名> setowner <玩家名>`为每一个假人登记所有者信息后，即可正常使用。
- **问：如果我不想在服务器中允许玩家自行创建假人，而由某个管理员统一分配，该如何配置？**
- 答：可以这样设置：在配置文件中将`MaxFpCountLimitEach`项设置为0，即不允许玩家自行创建假人。随后，用`/fpc settings addsu xxx`命令为服务器设置一些超级管理员。超级管理员可以无视上限限制使用`/fpc create`创建假人，随后使用`/fpc perm <假人名> setowner <玩家名>`将创建好的假人分配给其他玩家使用。

<br>

## 配置文件

位于`plugins\LLSE-FakePlayer\config.json`，样例配置文件如下：

```json5
{
    // 配置文件版本
    "Version": 2,
    // 输出日志等级，默认为4，一般不用修改
    "LogLevel": 4,
    // 语言，可选 default（自动）/ zh（简体中文）/ en（英文）
    "Language": "default",
    // 每个用户允许拥有的假人数量上限（超级管理员玩家不受此限制）
    "MaxFpCountLimitEach": 3,
    // 是否将OP玩家自动视为超级管理员，1为是，0为否
    "OpIsSu": 1,
    // 超级管理员玩家列表
    "SuList": [
        "yqs112358"
    ],
    // 假人用户模式，whitelist为白名单模式，blacklist为黑名单模式
    // 例如，在黑名单模式下，通过 /fpc setting ban命令可以禁用特定玩家使用假人系统
    // 默认情况下为黑名单模式
    "UserMode": "blacklist",
    // 黑名单/白名单玩家列表
    "UserList": []
}
```

<br/>

## 国际化与翻译

- 多语言翻译平台位于 [crowdin.com/project/llse-fakeplayer](https://crowdin.com/project/llse-fakeplayer)
- 欢迎有兴趣帮助进行语言翻译和修正的同学参与贡献

<br/>

## Bug跟踪和反馈

- Bug跟踪器位于 [Issues · YQ-LL-Plugins/LLSE-FakePlayer (github.com)](https://github.com/YQ-LL-Plugins/LLSE-FakePlayer/issues)
- 欢迎反馈假人插件存在的各种bug和问题，作者将择机进行修复

<br/><br/>

<br/>

## 导出函数（开发者章节）

插件导出了一系列函数，方便其他开发者通过跨插件调用与LLSE-FakePlayer进行机制互动。

#### 假人上线

- 函数原型：`function online(fpName:String, failIfOnline:Boolean) :String`
- 说明：使名字为fpName的假人上线
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "online")`

#### 假人下线

- 函数原型：`function offline(fpName:String, failIfOnline:Boolean) :String`
- 说明：使名字为fpName的假人下线
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "offline")`

#### 创建新的假人

- 函数原型：`function createNew(fpName:String, x:Float, y:Float, z:Float, dimid:Int, ownerName:String) :String`
- 说明：创建新的假人，但是不上线。ownerName为假人的所有者玩家名，每一个假人都必须拥有一个所有者。
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "createNew")`

#### 移除现有假人

- 函数原型：`function remove(fpName:String) :String`
- 说明：删除名字为fpName的现有的假人，假人不必在线
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "remove")`

#### 获取所有假人名字列表

- 函数原型：`function list() :[String, [String, String, ...]]`
- 说明：获取所有假人的名字列表
- 返回值：如果成功返回`["", [所有假人名字列表]]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "list")`

#### 获取某个假人的所有信息

- 函数原型：`function getAllInfo(fpName:String) :[String, {Object}]`
- 说明：获取某个特定假人的所有信息
- 返回值：如果成功返回`["", {此假人的所有信息}]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "getAllInfo")`

#### 获取某个假人的坐标

- 函数原型：`function getPosition(fpName:String) :[String, {Object}]`
- 说明：获取某个特定假人的所在坐标
- 返回值：如果成功返回`["", {x:..., y:..., z:..., dimid:...}]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "getPosition")`

#### 判断假人是否在线

- 函数原型：`function isOnline(fpName:String) :[String, Boolean]`
- 说明：获取某个特定假人的所在坐标
- 返回值：如果成功返回`["", true / false]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "isOnline")`

#### 设置假人模拟操作

- 函数原型：`function setOperation(fpName:String, operation:String, opInterval:Int, opMaxTimes:Int, opLength:Int) :String`
- 说明：设置某个假人进行模拟操作，operation可选值：`attack` `useitem` `interact`（`destroy`尚在修复之中暂不可用）。后面三个参数均为可选，如果不传入将以默认值提供。
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "setOperation")`

#### 停止假人模拟操作

- 函数原型：`function clearOperation(fpName:String) :String`
- 说明：停止某个假人进行的模拟操作
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "clearOperation")`

#### 使假人走向指定坐标（寻路）

- 函数原型：`function walkToPos(fpName:String, pos:FloatPos) :[String, {Object}]`
- 说明：使假人使用寻路算法尝试走向指定坐标，无论能否最终到达都返回路径。`path`为寻路算法得到的一系列路径三维坐标的数组，假人将按此路径行走；`isFullPath`表示是否最终到达了目标点，即使无法到达，假人也会行走到离目标最近的点才结束。
- 返回值：如果成功返回`["", {isFullPath:Boolean, path:Number[3][]} ]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "walkToPos")`

#### 使假人走向指定实体（寻路）

- 函数原型：`function walkToEntity(fpName:String, entity:Entity) :[String, {Object}]`
- 说明：使假人使用寻路算法尝试走向指定实体，无论能否最终到达都返回路径。`path`为寻路算法得到的一系列路径三维坐标的数组，假人将按此路径行走；`isFullPath`表示是否最终到达了目标点，即使无法到达，假人也会行走到离目标最近的点才结束。
- 返回值：如果成功返回`["", {isFullPath:Boolean, path:Number[3][]} ]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "walkToEntity")`

#### 使假人传送到指定坐标

- 函数原型：`function teleportToPos(fpName:String, pos:FloatPos) :String`
- 说明：使假人传送到指定坐标
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "teleportToPos")`

#### 使假人传送到指定实体处

- 函数原型：`function teleportToEntity(fpName:String, entity:Entity) :String`
- 说明：使假人传送到指定实体处
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "teleportToEntity")`

#### 将玩家主手物品给予假人

- 函数原型：`function giveItem(fpName:String, player:Player) :String`
- 说明：将指定玩家主手中的物品给予指定假人
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "giveItem")`

#### 获取假人背包信息

- 函数原型：`function getInventory(fpName:String) :[String, {Object}]`
- 说明：获取某个特定假人的背包中所有物品的信息。返回的Object的格式为：`{Hand: {name:"xxx", count:64}, OffHand: {name:"xxx", count:32}, Inventory: [null, {name:"xxx", count:64}, {...}], Armor: [{...}, {...}] }`（如果某一个格子为空，对应数组的位置是null）
- 返回值：如果成功返回`["", {Object}]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "getInventory")`

#### 假人设置主手选中物品

- 函数原型：`function setSelectSlot(fpName:String, slotId:Int) :String`
- 说明：获取某个假人主手选中的物品的物品栏槽位id（有效范围0-35）
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "setSelectSlot")`

#### 假人扔出指定槽位中物品

- 函数原型：`function dropItem(fpName:String, slotId:Int) :String`
- 说明：假人扔出指定槽位中物品，槽位id有效范围0-35，如果未传入slotId默认为扔出主手物品。
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "dropItem")`

#### 假人扔出背包中所有物品

- 函数原型：`function dropAllItems(fpName:String) :String`
- 说明：假人扔出背包中所有物品
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "dropAllItems")`

#### 假人开始与玩家行为同步

- 函数原型：`function startSync(fpName:String, player:Player) :String`
- 说明：假人开始与指定玩家行为同步（同步身体朝向、视角、同步移动等）
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "startSync")`

#### 假人停止与玩家行为同步

- 函数原型：`function stopSync(fpName:String) :String`
- 说明：假人停止与玩家行为同步
- 返回值：如果成功返回`""`，如果失败返回错误原因字符串
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "stopSync")`

#### 获取假人插件帮助信息

- 函数原型：`function getHelp() :[String, String]`
- 说明：假人停止与玩家行为同步
- 返回值：如果成功返回`["", "帮助信息字符串"]`，如果失败返回`["错误原因字符串", null]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "getHelp")`

#### 刷新假人数据到文件

- 函数原型：`function saveFpData(fpName:String, updatePos:Boolean) :Boolean`
- 说明：如果使用非本项目导出的 API 操作假人（如直接tp等），则操作完成后需要保存其数据到文件持久化。updatePos表示是否同时更新当前假人的坐标位置信息
- 返回值：如果成功返回`true`，如果失败返回`false`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "saveFpData")`

#### 刷新假人背包物品数据到文件

- 函数原型：`function saveInventoryData(fpName:String) :Boolean`
- 说明：如果使用非本项目导出的 API 操作假人的物品栏，则操作完成后需要保存其物品栏数据到文件持久化。
- 返回值：如果成功返回`true`，如果失败返回`false`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "saveInventoryData")`