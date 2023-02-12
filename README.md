# LLSE-FakePlayer

> A strong fake-player plugin for LiteLoaderBDS

## 命令

所有命令示例中，<>包括的为必选参数，[]包括的为可选参数

### 假人管理

- **假人上下线** 
  /fpc online / offline <fpname>
- **假人批量上下线** 
  /fpc onlineall / offlineall
- **创建假人**
  /fpc create <name> [x] [y] [z] [dimid]
- **移除假人**
  /fpc remove <fpname>
- **列出所有假人 / 查看假人详细信息**
  /fpc list [fpname]

### 假人行为控制

- **执行特定操作**
  /fpc operation <fpname> attack / interact [interval] [maxtimes]
  /fpc operation <fpname> useitem [length] [interval] [maxtimes]
- **行走到目标位置**
  /fpc walkto <fpname> <x> <y> <z>
  /fpc walkto <fpname> <player>
- **TP到目标位置**
  /fpc tp <fpname> <x> <y> <z>
  /fpc tp <fpname> <player>
- **将手中物品给予假人**
  /fpc give <fpname> 
- **查看假人物品栏**
  /fpc getinventory <fpname> 
- **选中物品栏某格子**
  /fpc setselect <fpname> <slotid>
- **扔出物品栏某格子物品**
  /fpc drop <fpname> [slotid]
- **扔出物品栏中所有物品**
  /fpc dropall <fpname>
- **和玩家同步行为（同步身体朝向、视角、同步移动等）**
  /fpc sync <fpname> start / stop

### 系统权限管理

管理员玩家可以执行几乎所有操作命令，用户玩家被限制为只能执行某些特定操作命令。具体限制详见配置文件

- **新增假人管理员玩家（仅在控制台可以执行）**
  /fpc addadmin / removeadmin <name>
- **新增假人用户玩家**
  /fpc adduser / removeuser / banuser / unbanuser <name>

### 其他命令

- **从其他假人工具导入数据（功能尚未完成）**
  /fpc import <path>
- **获取帮助信息**
  /fpc help