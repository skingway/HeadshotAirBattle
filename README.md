# Headshot: Air Battle (React Native)

飞机大战游戏 - React Native移动端版本

## 📱 项目状态

**当前版本**: Phase 6 完成
**开发进度**: 约75% (相对Web版全功能)
**最后更新**: 2026-01-29

---

## ✅ 已完成功能

- ✅ 完整的游戏核心（10×10, 15×15, 20×20棋盘）
- ✅ AI对战（Easy, Medium, Hard三个难度）
- ✅ 音频系统（BGM + 音效）
- ✅ 用户系统（Firebase认证）
- ✅ 统计系统（游戏历史、战报、排行榜）
- ✅ 皮肤系统（12个飞机皮肤 + 6个棋盘主题）
- ✅ 成就系统（19个成就）

---

## 📚 重要文档

### 必读文档
1. **[PROJECT_MASTER.md](./PROJECT_MASTER.md)** - 📋 项目总览（功能、进度、计划）
2. **[DEVELOPMENT_LOG.md](./DEVELOPMENT_LOG.md)** - 📝 开发日志
3. **[BUG_TRACKER.md](./BUG_TRACKER.md)** - 🐛 BUG追踪

---

## 🚀 快速开始

### 环境要求
- Node.js 18+
- React Native 0.77+
- Android SDK (或Xcode for iOS)

### 安装依赖
```bash
npm install
# 或
yarn install
```

### 运行开发版
```bash
# Android
npm run android

# iOS
npm run ios
```

### 构建APK
```bash
# Bundle
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

# Build
cd android && ./gradlew assembleDebug

# APK位置
# android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 📂 项目结构

```
src/
├── ai/              # AI策略
├── components/      # React组件
├── config/          # 配置文件
├── core/            # 核心游戏逻辑
├── screens/         # 页面组件
└── services/        # 服务层
```

---

## 🎯 下一步计划

1. **Phase 7**: 战斗回放系统（3-4天）
2. **Phase 8**: 在线多人对战（7-10天）

详见 [PROJECT_MASTER.md](./PROJECT_MASTER.md)

---

## 🔗 相关链接

- **Web版源码**: `d:\桌面\mygame\airplane_battle`
- **Firebase**: 已集成

---

## 📄 License

Private Project

---

**开发者**: Claude Sonnet 4.5
**项目开始**: 2026-01-25
