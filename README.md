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

- **创建假人**

  `/fpc create <name> [x] [y] [z] [dimid]`

- **移除假人**

  `/fpc remove <fpname>`

- **列出所有假人 / 查看假人详细信息**

  `/fpc list [fpname]`

### 假人行为控制

- **执行特定操作**

  `/fpc operation <fpname> attack / interact [interval] [maxtimes]`

  `/fpc operation <fpname> useitem [length] [interval] [maxtimes]`

  注意：operation的可选值：attack 攻击，interact 与方块互动，useitem 使用物品（destroy和place正在修复中）

  interval表示执行间隔，length表示工作的长度（这里表示useitem右键按多久），两者单位均为ms（毫秒）

  maxtimes 为最大执行次数，如果设置为-1，表示无限次执行

- **行走到目标位置**

  `/fpc walkto <fpname> <x> <y> <z>`

  `/fpc walkto <fpname> <player>`

  即使无法到达目标位置，假人仍然会行走到离目标最近的点才结束

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

### 系统权限管理

管理员玩家可以执行几乎所有操作命令，用户玩家被限制为只能执行某些特定操作命令。具体限制详见配置文件

- **新增假人管理员玩家**

  `/fpc addadmin / removeadmin <name>`

  此命令只能在控制台执行，避免玩家通过非法渠道获取权限

- **新增假人用户玩家**

  `/fpc adduser / removeuser / banuser / unbanuser <name>`
  
  用户玩家的相关配置见下面配置文件部分

### 其他命令

- **从其他假人工具导入数据**

  `/fpc import <path>`

  此功能尚未完成

- **获取帮助信息**

  `/fpc help`

<br/>

## 系统权限管理机制

上面命令中提到的权限管理机制，在这里做一下说明：

- 系统分为 admin 和 user 两级用户机制，用于区分假人管理员和假人普通用户。

- 假人管理员

  - 管理员拥有最高权限，可以执行系统中所有的假人操作
  - 只能在后台控制台使用命令添加和删除

- 假人普通用户

  - 普通用户拥有有限的假人操作权限，具体权限限制位于配置文件中，可以按需修改
  - 分为白名单 / 黑名单模式，可以按需选取使用。默认为白名单模式，如果需要修改请前往配置文件处修改
  - 白名单模式下，所有玩家默认无权使用假人，需要手动添加玩家进入白名单；黑名单模式下，所有玩家默认都属于假人用户，可以向黑名单中加入需要禁止使用假人的玩家

  - 普通用户可以由假人管理员使用命令添加和删除，也可以在后台控制台使用命令添加和删除。命令根据白名单 / 黑名单模式而有所不同

<br/>

## 配置文件

位于`plugins\LLSE-FakePlayer\config.json`，样例配置文件如下：

```json5
{
    // 输出日志等级，默认为4，一般不用修改
    "LogLevel": 4,
    // 是否将OP玩家自动视为假人管理员，1为是，0为否
    "OpIsAdmin": 1,
    // 假人管理员玩家列表
    "AdminList": [
        "yqs112358"
    ],
    // 假人用户玩家模式，whitelist为白名单模式，blacklist为黑名单模式
    "UserMode": "whitelist",
    // 假人用户被允许执行的操作命令
    // 所有可选的操作命令列表：online offline onlineall offlineall create remove list operation walkto tp give getinventory setselect drop dropall sync help gui
    "UserAllowAction": [
        "online",
        "offline",
        "list",
        "getinventory",
        "help",
        "gui"
    ],
    // 假人用户玩家列表（如果为白名单模式，则此处为玩家白名单，否则为玩家黑名单）
    "UserList": [
        "testuser"
    ]
}
```

> 另外，位于`plugins\LLSE-FakePlayer\fpdata\`目录里面的每一个文件储存每一个假人的记录数据，位于`plugins\LLSE-FakePlayer\fpinventorys\`目录里面的每一个文件储存每一个假人的物品栏数据。不建议普通用户修改这两个位置的储存数据，任何一点错误的修改将导致插件无法正常工作。

<br/>

## 已知问题

目前已知有这些bug，等待修复：

- sync只能二维寻路
- setselect后手中的物品不马上显示，要玩家重进游戏才能看到
- operation时不会保持sync已经看向的头部朝向

<br/><br/>

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

#### 所有假人上线

- 函数原型：`function onlineAll() :[String, [String, String, ...]]`
- 说明：使所有的假人上线，如果没有全部成功上线，会给出成功上线的名字列表
- 返回值：如果成功返回`["", [所有假人名字列表]]`，如果失败返回`["错误原因字符串", [已经成功上线的假人名字列表]]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "onlineAll")`

#### 所有假人下线

- 函数原型：`function offlineAll() :[String, [String, String, ...]]`
- 说明：使所有的假人下线，如果没有全部成功下线，会给出成功下线的名字列表
- 返回值：如果成功返回`["", [所有假人名字列表]]`，如果失败返回`["错误原因字符串", [已经成功下线的假人名字列表]]`
- 导入方法：`ll.import("_LLSE_FakePlayer_PLUGIN_", "offlineAll")`

#### 创建新的假人

- 函数原型：`function createNew(fpName:String, x:Float, y:Float, z:Float, dimid:Int) :String`
- 说明：创建新的假人，但是不上线
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