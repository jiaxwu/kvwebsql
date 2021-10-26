/* eslint-disable no-unused-vars */
/**
 * KVWebSQL
 */
 export default class KVWebSQL {
  /**
   * 数据库实例
   */
  webSQL;

  /**
   * 数据库名
   */
  dbName;

  /**
   * 表名
   */
  tableName;

  /**
   * key的序列化器
   */
  keySerializer = KVWebSQL.emptySerializer;

  /**
   * key的反序列化器
   */
  keyDeserializer = KVWebSQL.emptyDeserializer;

  /**
   * value的序列化器
   */
  valueSerializer = KVWebSQL.jsonSerializer;

  /**
   * value的反序列化器
   */
  valueDeserializer = KVWebSQL.jsonDeserializer;

  /**
   * 空序列化器
   * @param {Object} o
   * @returns {Object}
   */
  static emptySerializer = (o) => o;

  /**
   * 空反序列化器
   * @param {Object} o
   * @returns {Object}
   */
  static emptyDeserializer = (o) => o;

  /**
   * JSON序列化器
   * @param {Object} o
   * @returns {String}
   */
  static jsonSerializer = (o) => JSON.stringify(o);

  /**
   * JSON反序列化器
   * @param {String} s
   * @returns {Object}
   */
  static jsonDeserializer = (s) => JSON.parse(s);

  constructor(dbName, tableName) {
    if (!dbName) {
      throw new Error("数据库名不能为空");
    }
    if (!tableName) {
      throw new Error("表名不能为空");
    }
    this.dbName = dbName;
    this.tableName = tableName;
  }

  /**
   * 初始化KVWebSQL
   * @throws {Error}
   */
  async init() {
    this.openDb();
    this.createTable();
  }

  /**
   * 创建一个默认KVWebSQL
   *
   * @param {String} dbName 数据库名
   * @param {String} tableName 表名
   * @returns {KVWebSQL} KVWebSQL
   * @throws {Error}
   */
  static async buildDefaultKVWebSQL(dbName, tableName) {
    const kvWebSQL = new KVWebSQL(dbName, tableName);
    await kvWebSQL.init();
    return kvWebSQL;
  }

  /**
   * 设置值
   * @param {Object} key 键
   * @param {Object} value 值
   * @throws {Error}
   */
  async put(key, value) {
    return this.transaction(
      `INSERT OR REPLACE INTO ${this.tableName} (key, value) VALUES (?, ?)`,
      [this.keySerializer(key), this.valueSerializer(value)],
      false
    );
  }

  /**
   * 获取值
   * @param {Object} key 键
   * @returns {Object} 值，找不到返回null
   * @throws {Error}
   */
  async get(key) {
    const res = await this.transaction(
      `SELECT key, value FROM ${this.tableName} WHERE key = ?`,
      [this.keySerializer(key)],
      true
    );
    return res.length > 0 ? this.valueDeserializer(res[0].value) : null;
  }

  /**
   * 移除值
   * @param {Object} key  键
   * @throws {Error}
   */
  async remove(key) {
    return this.transaction(
      `DELETE FROM ${this.tableName} WHERE key = ?`,
      [this.keySerializer(key)],
      false
    );
  }

  /**
   * 是否包含key
   * @param {Object} key 键
   * @returns {Boolean} 是否包含key
   * @throws {Error}
   */
  async containsKey(key) {
    const res = await this.transaction(
      `SELECT key FROM ${this.tableName} WHERE key = ?`,
      [this.keySerializer(key)],
      true
    );
    return res.length > 0;
  }

  /**
   * 清空表
   * @throws {Error}
   */
  async clear() {
    return this.transaction(`DELETE FROM ${this.tableName}`, [], false);
  }

  /**
   * 获取表的记录数
   * @returns {Number} 数量
   * @throws {Error}
   */
  async size() {
    const res = await this.transaction(
      `SELECT COUNT(*) AS size FROM ${this.tableName}`,
      [],
      true
    );
    return res[0].size;
  }

  /**
   * 获取全部key，返回Array集合
   * @returns {Array<Object>} keys
   * @throws {Error}
   */
  async keys() {
    const res = await this.transaction(
      `SELECT key FROM ${this.tableName}`,
      [],
      true
    );
    const keys = new Array(res.length);
    for (let i = 0; i < res.length; i++) {
      keys[i] = this.keyDeserializer(res[i].key);
    }
    return keys;
  }

  /**
   * 获取全部key，返回Set集合
   * @returns {Set<Object>} keySet
   * @throws {Error}
   */
  async keySet() {
    const res = await this.transaction(
      `SELECT key FROM ${this.tableName}`,
      [],
      true
    );
    const keySet = new Set();
    for (let i = 0; i < res.length; i++) {
      keySet.add(this.keyDeserializer(res[i].key));
    }
    return keySet;
  }

  /**
   * 获取全部value，返回Array集合
   * @returns {Array<Object>} values
   * @throws {Error}
   */
  async values() {
    const res = await this.transaction(
      `SELECT value FROM ${this.tableName}`,
      [],
      true
    );
    const values = new Array(res.length);
    for (let i = 0; i < res.length; i++) {
      values[i] = this.valueDeserializer(res[i].value);
    }
    return values;
  }

  /**
   * 获取全部key-value，返回Map集合
   * @returns {Map<Object, Object>} map
   * @throws {Error}
   */
  async map() {
    const res = await this.transaction(
      `SELECT key, value FROM ${this.tableName}`,
      [],
      true
    );
    const map = new Map();
    for (let i = 0; i < res.length; i++) {
      map.set(
        this.keyDeserializer(res[i].key),
        this.valueDeserializer(res[i].value)
      );
    }
    return map;
  }

  /**
   * 表是否为空
   * @returns {Boolean} 是否为空
   * @throws {Error}
   */
  async isEmpty() {
    const res = await this.transaction(
      `SELECT key FROM ${this.tableName} LIMIT 1`,
      [],
      true
    );
    return res.length === 0;
  }

  /**
   * 打开数据库，打开后可以对数据库进行操作
   * @throws {Error}
   */
  openDb() {
    this.webSQL = openDatabase(this.dbName, "1.0", "由Kvite创建", 0);
  }

  /**
   * 关闭数据库，关闭后无法对数据库进行操作
   */
  closeDb() {
    this.webSQL = null;
  }

  /**
   * 数据库是否关闭
   * @returns {Boolean} 数据库是否关闭
   */
  isOpenDb() {
    return Boolean(this.webSQL);
  }

  /**
   * 创建表
   * @throws {Error}
   */
  async createTable() {
    return this.transaction(
      `CREATE TABLE IF NOT EXISTS ${this.tableName} (key unique, value)`,
      [],
      false
    );
  }

  /**
   * 删除表
   * @throws {Error}
   */
  async removeTable() {
    return this.transaction(`DROP TABLE ${this.tableName}`, [], false);
  }

  /**
   * 设置key序列化器
   * @param {Object => Object} 序列化器
   */
  setKeySerializer(serializer) {
    this.keySerializer = serializer;
  }

  /**
   * 设置key反序列化器
   * @param {Object => Object} 反序列化器
   */
  setKeyDeserializer(deserializer) {
    this.keyDeserializer = deserializer;
  }

  /**
   * 设置value序列化器
   * @param {Object => Object} 序列化器
   */
  setValueSerializer(serializer) {
    this.valueSerializer = serializer;
  }

  /**
   * 设置value反序列化器
   * @param {Object => Object} 反序列化器
   */
  setValueDeserializer(deserializer) {
    this.valueDeserializer = deserializer;
  }

  /**
   * 获取数据库名
   * @returns {String} 数据库名
   */
  getDbName() {
    return this.dbName;
  }

  /**
   * 获取表名
   * @returns {String} 表名
   */
  getTableName() {
    return this.tableName;
  }

  /**
   * 检查WebSQL是否正常
   * @throws {Error}
   */
  checkWebSQL() {
    if (!this.isOpenDb()) {
      throw new Error("请先打开数据库");
    }
  }

  /**
   * 执行事务的封装
   * @param {String} sql SQL
   * @param {Array<Object>} params 参数列表
   * @param {Boolean} needRes 是否需要结果
   * @returns {SQLResultSetRowList} 执行结果
   */
  async transaction(sql, params, needRes) {
    this.checkWebSQL();
    return new Promise((resolve, reject) => {
      this.webSQL.transaction((tx) => {
        tx.executeSql(
          sql,
          params,
          (tx, res) => {
            if (needRes) {
              resolve(res.rows);
            } else {
              resolve();
            }
          },
          (tx, err) => {
            reject(err);
          }
        );
      });
    });
  }
}
