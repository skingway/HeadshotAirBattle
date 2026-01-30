/**
 * Ultra AI Strategy V2 - "Lock Head" Algorithm
 * 基于候选飞机集合的概率推理算法
 *
 * 核心思想：
 * 1. 预计算所有可能的飞机位置
 * 2. 根据hit/miss结果不断缩小候选集
 * 3. 优先攻击机头概率最高的格子
 *
 * 三个状态：
 * - SEARCH: 搜索阶段，寻找任意飞机部位
 * - LOCK: 锁定阶段，推断飞机方向和机头位置
 * - KILL: 处决阶段，直接打机头
 */

import GameConstants from '../config/GameConstants.js';
import CoordinateSystem from '../core/CoordinateSystem.js';
import Airplane from '../core/Airplane.js';
import AIStrategy from './AIStrategy.js';

class AIStrategyUltraV2 extends AIStrategy {
  constructor(difficulty, boardSize) {
    super(difficulty, boardSize);

    // AI状态机
    this.AI_STATE = {
      SEARCH: 'search',
      LOCK: 'lock',
      KILL: 'kill'
    };

    this.aiState = this.AI_STATE.SEARCH;
    this.candidatePlanes = [];
    this.shotsHistory = [];

    // 初始化所有可能的飞机位置
    this.initCandidatePlanes();

    console.log('[Ultra AI V2] Initialized with', this.candidatePlanes.length, 'candidate planes');
  }

  /**
   * 飞机模板定义（使用游戏实际的Airplane类）
   */
  getPlaneTemplates() {
    // 直接使用游戏的Airplane类生成所有可能的飞机
    const templates = [];
    const directions = ['up', 'down', 'left', 'right'];

    // 为每个方向创建一个临时飞机，获取其单元格布局
    for (const direction of directions) {
      // 在(5,5)创建一个临时飞机（确保不越界）
      const tempAirplane = new Airplane(5, 5, direction, -1);
      const cells = tempAirplane.getCells();

      // 将绝对坐标转换为相对于机头的偏移
      const offsets = cells.map(cell => ({
        row: cell.row - 5,  // 相对于机头的偏移
        col: cell.col - 5,
        type: cell.type
      }));

      templates.push({
        direction: direction,
        offsets: offsets
      });
    }

    return templates;
  }

  /**
   * 初始化所有可能的飞机位置
   */
  initCandidatePlanes() {
    this.candidatePlanes = [];
    const templates = this.getPlaneTemplates();

    console.log('[Ultra AI V2] Initializing with', templates.length, 'templates');

    // 枚举所有可能的机头位置
    for (let headRow = 0; headRow < this.boardSize; headRow++) {
      for (let headCol = 0; headCol < this.boardSize; headCol++) {
        for (const template of templates) {
          const plane = this.buildPlane(headRow, headCol, template);
          if (this.isPlaneInsideBoard(plane)) {
            this.candidatePlanes.push(plane);
          }
        }
      }
    }

    console.log('[Ultra AI V2] Generated', this.candidatePlanes.length, 'candidate planes');
  }

  /**
   * 构建飞机对象（以机头为基准）
   */
  buildPlane(headRow, headCol, template) {
    const cells = [];
    let head = { row: headRow, col: headCol };

    for (const offset of template.offsets) {
      const cell = {
        row: headRow + offset.row,
        col: headCol + offset.col,
        type: offset.type
      };
      cells.push(cell);
    }

    return {
      direction: template.direction,
      headPos: { row: headRow, col: headCol },
      cells: cells,
      head: head
    };
  }

  /**
   * 检查飞机是否完全在棋盘内
   */
  isPlaneInsideBoard(plane) {
    return plane.cells.every(cell =>
      cell.row >= 0 && cell.row < this.boardSize &&
      cell.col >= 0 && cell.col < this.boardSize
    );
  }

  /**
   * Override getHardAttack
   */
  getHardAttack(opponentBoard) {
    console.log('[Ultra AI V2] ========== TURN START ==========');
    console.log('[Ultra AI V2] State:', this.aiState);
    console.log('[Ultra AI V2] Candidate planes:', this.candidatePlanes.length);

    // 更新候选集合
    this.updateCandidatePlanes(opponentBoard);

    // CRITICAL: 如果有活跃hits但候选很多，尝试快速探测方向
    const history = opponentBoard.getAttackHistory();
    const activeHits = history.filter(s => s.result === GameConstants.ATTACK_RESULTS.HIT);

    if (activeHits.length > 0 && this.candidatePlanes.length > 20) {
      const directionProbe = this.probeDirectionFromHit(activeHits[activeHits.length - 1], opponentBoard);
      if (directionProbe) {
        console.log('[Ultra AI V2] 🧭 DIRECTION PROBE from last hit');
        return directionProbe;
      }
    }

    // 根据状态选择攻击策略
    let target = null;
    switch (this.aiState) {
      case this.AI_STATE.SEARCH:
        target = this.searchShot(opponentBoard);
        break;
      case this.AI_STATE.LOCK:
        target = this.lockShot(opponentBoard);
        break;
      case this.AI_STATE.KILL:
        target = this.killShot(opponentBoard);
        break;
    }

    if (target) {
      console.log('[Ultra AI V2] 🎯 Target:', target, '| Strategy:', this.aiState);
      return target;
    }

    // Fallback
    console.log('[Ultra AI V2] ⚠️ Fallback to random');
    return this.getRandomAttack(opponentBoard);
  }

  /**
   * 从hit点探测方向（快速缩小候选）
   */
  probeDirectionFromHit(hit, opponentBoard) {
    // 如果有多个hits，尝试推断轴线方向
    const history = opponentBoard.getAttackHistory();
    const activeHits = history.filter(s => s.result === GameConstants.ATTACK_RESULTS.HIT);

    if (activeHits.length >= 2) {
      // 检查是否有两个hits在同一条线上
      for (let i = 0; i < activeHits.length - 1; i++) {
        for (let j = i + 1; j < activeHits.length; j++) {
          const hit1 = activeHits[i];
          const hit2 = activeHits[j];

          // 同一行或同一列
          if (hit1.row === hit2.row || hit1.col === hit2.col) {
            // 找到轴线！推断机头位置
            const headCandidates = this.findHeadFromAlignedHits(hit1, hit2, opponentBoard);
            if (headCandidates.length > 0) {
              console.log('[Ultra AI V2] 🎯 ALIGNED HITS DETECTED - Direct head inference');
              return headCandidates[0];
            }
          }
        }
      }
    }

    // 如果没有对齐的hits，进行方向探测
    const directions = [
      { row: -1, col: 0 },  // 上
      { row: 1, col: 0 },   // 下
      { row: 0, col: -1 },  // 左
      { row: 0, col: 1 }    // 右
    ];

    const validProbes = [];

    for (const dir of directions) {
      const probeRow = hit.row + dir.row;
      const probeCol = hit.col + dir.col;

      if (probeRow >= 0 && probeRow < this.boardSize &&
          probeCol >= 0 && probeCol < this.boardSize &&
          !opponentBoard.isCellAttacked(probeRow, probeCol)) {

        // 计算这个方向上有多少候选飞机
        const candidatesInDirection = this.candidatePlanes.filter(plane => {
          return plane.cells.some(c => c.row === probeRow && c.col === probeCol);
        }).length;

        validProbes.push({
          row: probeRow,
          col: probeCol,
          candidates: candidatesInDirection
        });
      }
    }

    // 选择候选最多的方向（信息增益最大）
    if (validProbes.length > 0) {
      validProbes.sort((a, b) => b.candidates - a.candidates);
      return validProbes[0];
    }

    return null;
  }

  /**
   * 从对齐的hits推断机头位置
   */
  findHeadFromAlignedHits(hit1, hit2, opponentBoard) {
    const candidates = [];

    if (hit1.row === hit2.row) {
      // 水平对齐 - 机头在垂直方向
      const row = hit1.row;
      const minCol = Math.min(hit1.col, hit2.col);
      const maxCol = Math.max(hit1.col, hit2.col);
      const centerCol = Math.round((minCol + maxCol) / 2);

      // 只测试候选飞机集中机头最高频的位置
      const headMap = {};
      for (const plane of this.candidatePlanes) {
        if (plane.head) {
          const key = `${plane.head.row},${plane.head.col}`;
          headMap[key] = (headMap[key] || 0) + 1;
        }
      }

      // 优先尝试垂直方向
      const potentials = [
        { row: row - 1, col: centerCol },
        { row: row + 1, col: centerCol },
        { row: row - 2, col: centerCol },
        { row: row + 2, col: centerCol }
      ];

      for (const pos of potentials) {
        if (pos.row >= 0 && pos.row < this.boardSize &&
            pos.col >= 0 && pos.col < this.boardSize &&
            !opponentBoard.isCellAttacked(pos.row, pos.col)) {
          const key = `${pos.row},${pos.col}`;
          const score = headMap[key] || 0;
          if (score > 0) {
            candidates.push({ ...pos, score });
          }
        }
      }
    } else if (hit1.col === hit2.col) {
      // 垂直对齐 - 机头在垂直线的两端
      const col = hit1.col;
      const minRow = Math.min(hit1.row, hit2.row);
      const maxRow = Math.max(hit1.row, hit2.row);

      // 只测试候选飞机集中机头最高频的位置
      const headMap = {};
      for (const plane of this.candidatePlanes) {
        if (plane.head) {
          const key = `${plane.head.row},${plane.head.col}`;
          headMap[key] = (headMap[key] || 0) + 1;
        }
      }

      // 机头在两端
      const potentials = [
        { row: minRow - 1, col: col },
        { row: maxRow + 1, col: col },
        { row: minRow - 2, col: col },
        { row: maxRow + 2, col: col }
      ];

      for (const pos of potentials) {
        if (pos.row >= 0 && pos.row < this.boardSize &&
            pos.col >= 0 && pos.col < this.boardSize &&
            !opponentBoard.isCellAttacked(pos.row, pos.col)) {
          const key = `${pos.row},${pos.col}`;
          const score = headMap[key] || 0;
          if (score > 0) {
            candidates.push({ ...pos, score });
          }
        }
      }
    }

    // 按得分排序
    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  /**
   * 根据已知信息缩小候选集
   */
  updateCandidatePlanes(opponentBoard) {
    const history = opponentBoard.getAttackHistory();
    const destroyedAirplanes = new Set();
    const destroyedCells = new Set(); // 记录已被击落飞机占用的所有格子

    // 找出已被摧毁的飞机和它们占用的格子
    const airplanes = opponentBoard?.airplanes || [];
    airplanes.forEach(airplane => {
      if (airplane && airplane.isDestroyed) {
        destroyedAirplanes.add(airplane.id);
        // 记录这架飞机的所有格子
        const cells = airplane.getCells ? airplane.getCells() : [];
        cells.forEach(cell => {
          if (cell) {
            destroyedCells.add(`${cell.row},${cell.col}`);
          }
        });
      }
    });

    // 只保留未被摧毁的飞机的hits
    const activeHits = history.filter(shot =>
      shot.result === GameConstants.ATTACK_RESULTS.HIT &&
      (shot.airplaneId === undefined || !destroyedAirplanes.has(shot.airplaneId))
    );

    // 过滤候选飞机
    this.candidatePlanes = this.candidatePlanes.filter(plane => {
      // 检查是否与已击落飞机的格子重叠
      for (const cell of plane.cells) {
        if (destroyedCells.has(`${cell.row},${cell.col}`)) {
          return false; // 与已击落飞机重叠，排除
        }
      }

      // 检查所有MISS
      for (const shot of history) {
        if (shot.result === GameConstants.ATTACK_RESULTS.MISS) {
          const cellInPlane = plane.cells.find(c => c.row === shot.row && c.col === shot.col);
          if (cellInPlane) return false; // MISS位置不能有飞机
        }
      }

      // 检查所有活跃的HIT - 飞机必须包含所有活跃hits
      for (const hit of activeHits) {
        const cellInPlane = plane.cells.find(c => c.row === hit.row && c.col === hit.col);
        if (!cellInPlane) return false; // 飞机必须包含所有HIT点
      }

      return true;
    });

    // 保护机制：如果候选数为0但还有飞机未击落，重新初始化
    const remainingAirplanes = airplanes.filter(a => !a.isDestroyed).length;
    if (this.candidatePlanes.length === 0 && remainingAirplanes > 0) {
      console.warn('[Ultra AI V2] ⚠️ Candidate pool exhausted but', remainingAirplanes, 'airplanes remain. Reinitializing...');
      this.initCandidatePlanes();

      // 重新应用已知信息过滤（只过滤MISS和已击落飞机，不过滤HIT）
      this.candidatePlanes = this.candidatePlanes.filter(plane => {
        // 检查是否与已击落飞机的格子重叠
        for (const cell of plane.cells) {
          if (destroyedCells.has(`${cell.row},${cell.col}`)) {
            return false;
          }
        }

        // 检查所有MISS
        for (const shot of history) {
          if (shot.result === GameConstants.ATTACK_RESULTS.MISS) {
            const cellInPlane = plane.cells.find(c => c.row === shot.row && c.col === shot.col);
            if (cellInPlane) return false;
          }
        }

        return true;
      });

      console.log('[Ultra AI V2] ✓ Reinitialized with', this.candidatePlanes.length, 'candidates');
    }

    // 根据候选数量和活跃hits切换状态（更激进）
    const prevState = this.aiState;
    if (this.candidatePlanes.length < 5 || activeHits.length >= 2) {
      this.aiState = this.AI_STATE.KILL;
    } else if (this.candidatePlanes.length < 50 || activeHits.length >= 1) {
      this.aiState = this.AI_STATE.LOCK;
    } else {
      this.aiState = this.AI_STATE.SEARCH;
    }

    if (prevState !== this.aiState) {
      console.log('[Ultra AI V2] 🔄 State changed:', prevState, '→', this.aiState, '| Candidates:', this.candidatePlanes.length, '| Active hits:', activeHits.length);
    }
  }

  /**
   * 搜索阶段：打全局概率最高的格子
   */
  searchShot(opponentBoard) {
    const scoreMap = {};
    const history = opponentBoard.getAttackHistory();
    const activeHits = history.filter(s => s.result === GameConstants.ATTACK_RESULTS.HIT);
    const misses = history.filter(s => s.result === GameConstants.ATTACK_RESULTS.MISS);

    // 计算每个格子的得分
    for (const plane of this.candidatePlanes) {
      // 机头权重最高
      let headWeight = 15; // 进一步提高基础权重

      // 边缘/角落加成（玩家喜欢藏在边缘）
      if (plane.head) {
        const isEdge = plane.head.row === 0 || plane.head.row === this.boardSize - 1 ||
                       plane.head.col === 0 || plane.head.col === this.boardSize - 1;
        const isCorner = (plane.head.row === 0 || plane.head.row === this.boardSize - 1) &&
                         (plane.head.col === 0 || plane.head.col === this.boardSize - 1);

        if (isCorner) {
          headWeight += 80; // 角落巨大加成
        } else if (isEdge) {
          headWeight += 50; // 边缘大加成
        }

        // 中心区域也有加成（玩家可能藏在中间）
        const centerDist = Math.abs(plane.head.row - this.boardSize / 2) +
                          Math.abs(plane.head.col - this.boardSize / 2);
        if (centerDist <= 2) {
          headWeight += 20; // 中心区域加成
        }

        // 如果机头附近有已知hits，大幅提高权重
        let nearbyHits = 0;
        for (const hit of activeHits) {
          const dist = Math.abs(plane.head.row - hit.row) + Math.abs(plane.head.col - hit.col);
          if (dist <= 3) nearbyHits++;
        }
        if (nearbyHits > 0) {
          headWeight += nearbyHits * 200; // 每个附近hit +200
        }

        // 远离misses区域
        let nearbyMisses = 0;
        for (const miss of misses) {
          const dist = Math.abs(plane.head.row - miss.row) + Math.abs(plane.head.col - miss.col);
          if (dist <= 1) nearbyMisses++;
        }
        if (nearbyMisses > 0) {
          headWeight -= nearbyMisses * 5; // 每个附近miss -5
        }
      }

      this.scoreCell(scoreMap, plane.head, headWeight);

      // 其他部位权重大幅降低
      for (const cell of plane.cells) {
        if (cell.type !== 'head') {
          let weight = 0.5; // 降低非机头权重
          if (cell.type === 'body') weight = 1;
          this.scoreCell(scoreMap, cell, weight);
        }
      }
    }

    return this.pickMaxScoreCell(scoreMap, opponentBoard);
  }

  /**
   * 锁定阶段：优先攻击机头 + 信息熵最小化
   */
  lockShot(opponentBoard) {
    // 特殊处理：候选数很少时，直接打候选飞机上的格子
    if (this.candidatePlanes.length <= 3) {
      console.log('[Ultra AI V2] 🎯 Few candidates, direct targeting');

      // 收集所有候选飞机的所有格子，按优先级排序
      const targetCells = [];

      for (const plane of this.candidatePlanes) {
        for (const cell of plane.cells) {
          if (!opponentBoard.isCellAttacked(cell.row, cell.col)) {
            // 机头优先级最高
            const priority = cell.type === 'head' ? 1000 :
                           cell.type === 'body' ? 100 : 10;
            targetCells.push({
              row: cell.row,
              col: cell.col,
              priority: priority,
              type: cell.type
            });
          }
        }
      }

      // 按优先级排序
      targetCells.sort((a, b) => b.priority - a.priority);

      if (targetCells.length > 0) {
        const target = targetCells[0];
        console.log('[Ultra AI V2] 🎯 Direct target:', target.type, 'at', `(${target.row},${target.col})`);
        return { row: target.row, col: target.col, score: target.priority };
      }
    }

    const headMap = {};
    const infoGainMap = {};

    // 计算每个机头的出现频率
    for (const plane of this.candidatePlanes) {
      this.scoreCell(headMap, plane.head, 1);
    }

    // 信息熵最小化：选择能最大程度减少候选集的攻击
    const allUnattackedCells = [];
    for (let row = 0; row < this.boardSize; row++) {
      for (let col = 0; col < this.boardSize; col++) {
        if (!opponentBoard.isCellAttacked(row, col)) {
          allUnattackedCells.push({ row, col });
        }
      }
    }

    // 对每个未攻击的格子，计算信息增益
    for (const cell of allUnattackedCells) {
      let infoGain = 0;

      // HIT情况：会排除多少候选
      const hitEliminations = this.candidatePlanes.filter(plane => {
        return !plane.cells.some(c => c.row === cell.row && c.col === cell.col);
      }).length;

      // MISS情况：会排除多少候选
      const missEliminations = this.candidatePlanes.filter(plane => {
        return plane.cells.some(c => c.row === cell.row && c.col === cell.col);
      }).length;

      // 信息增益 = 期望排除的候选数
      infoGain = Math.min(hitEliminations, missEliminations);

      // 如果是机头，加大权重
      const isHead = headMap[`${cell.row},${cell.col}`] > 0;
      if (isHead) {
        infoGain += headMap[`${cell.row},${cell.col}`] * 50; // 机头权重巨大
      }

      this.scoreCell(infoGainMap, cell, infoGain);
    }

    // 优先选择信息增益最大的点
    const bestShot = this.pickMaxScoreCell(infoGainMap, opponentBoard);
    if (bestShot) {
      const isHead = headMap[`${bestShot.row},${bestShot.col}`] > 0;
      console.log('[Ultra AI V2] 🔫', isHead ? 'HEAD SHOT' : 'INFO GAIN', 'attempt | Score:', bestShot.score);
      return bestShot;
    }

    // 如果所有机头都被攻击过，打其他部位继续收集信息
    return this.searchShot(opponentBoard);
  }

  /**
   * 处决阶段：只打机头
   */
  killShot(opponentBoard) {
    console.log('[Ultra AI V2] ☠️ KILL MODE - Only', this.candidatePlanes.length, 'possibilities left');
    return this.lockShot(opponentBoard);
  }

  /**
   * 给格子打分
   */
  scoreCell(map, cell, score) {
    if (!cell) return;
    const key = `${cell.row},${cell.col}`;
    map[key] = (map[key] || 0) + score;
  }

  /**
   * 选择得分最高且未被攻击的格子
   */
  pickMaxScoreCell(map, opponentBoard) {
    let best = null;
    let maxScore = -Infinity;

    for (const key in map) {
      const [row, col] = key.split(',').map(Number);

      // 跳过已攻击的格子
      if (opponentBoard.isCellAttacked(row, col)) {
        continue;
      }

      if (map[key] > maxScore) {
        maxScore = map[key];
        best = { row, col, score: map[key] };
      }
    }

    return best;
  }

  /**
   * Override processAttackResult
   */
  processAttackResult(attackPos, result) {
    super.processAttackResult(attackPos, result);

    if (result.result === GameConstants.ATTACK_RESULTS.KILL) {
      console.log('[Ultra AI V2] ✅ KILL! Perfect head shot.');
      // 重置候选集，移除已摧毁的飞机
      // (updateCandidatePlanes会在下一回合自动处理)
    } else if (result.result === GameConstants.ATTACK_RESULTS.HIT) {
      console.log('[Ultra AI V2] 🎯 HIT! Narrowing down candidates...');
    } else {
      console.log('[Ultra AI V2] ❌ MISS. Eliminating impossible positions...');
    }
  }
}

export default AIStrategyUltraV2;
