var
  _ = require('lodash'),
  sinon = require('sinon'),
  Kuzzle = require('../../lib/api/kuzzle'),
  Promise = require('bluebird'),
  config = require('../../lib/config'),
  foo = {foo: 'bar'};

/**
 * @constructor
 */
function KuzzleMock () {
  var k;

  for (k in this) {
    if (!this.hasOwnProperty(k)) {
      this[k] = function () {               // eslint-disable-line no-loop-func
        throw new Error(`Kuzzle original property ${k} is not mocked`);
      };
    }
  }

  // we need a deep copy here
  this.config = _.merge({}, config);

  this.dsl = {
    register: sinon.stub().returns(Promise.resolve())
  };

  this.gc = {
    init: sinon.spy(),
    run: sinon.spy()
  };

  this.entryPoints = {
    http: {
      init: sinon.spy()
    },
    init: sinon.spy(),
    proxy: {
      dispatch: sinon.spy(),
      joinChannel: sinon.spy(),
      leaveChannel: sinon.spy()
    }
  };

  this.funnel = {
    controllers: {
      admin: {
        adminExists: sinon.spy(),
        createFirstAdmin: sinon.spy()
      }
    },
    init: sinon.spy(),
    handleErrorDump: sinon.spy()
  };

  this.hooks = {
    init: sinon.spy()
  };

  this.hotelClerk = {
    addToChannels: sinon.stub(),
    getRealtimeCollections: sinon.stub()
  };

  this.indexCache = {
    add: sinon.stub(),
    exists: sinon.stub(),
    init: sinon.stub().returns(Promise.resolve()),
    initInternal: sinon.stub().returns(Promise.resolve()),
    remove: sinon.stub(),
    reset: sinon.stub()
  };

  this.internalEngine = {
    bootstrap: {
      adminExists: sinon.stub().returns(Promise.resolve(true)),
      all: sinon.stub().returns(Promise.resolve()),
      createCollections: sinon.stub().returns(Promise.resolve()),
      createRolesCollection: sinon.stub().returns(Promise.resolve()),
      createProfilesCollection: sinon.stub().returns(Promise.resolve()),
      createUsersCollection: sinon.stub().returns(Promise.resolve()),
      createPluginsCollection: sinon.stub().returns(Promise.resolve())
    },
    createInternalIndex: sinon.stub().returns(Promise.resolve()),
    createOrReplace: sinon.stub().returns(Promise.resolve()),
    deleteIndex: sinon.stub().returns(Promise.resolve()),
    get: sinon.stub().returns(Promise.resolve(foo)),
    index: 'internalIndex',
    init: sinon.stub().returns(Promise.resolve()),
    refresh: sinon.stub().returns(Promise.resolve()),
    search: sinon.stub().returns(Promise.resolve()),
    updateMapping: sinon.stub().returns(Promise.resolve())
  };

  this.once = sinon.stub();

  this.notifier = {
    init: sinon.spy(),
    notify: sinon.spy(),
    notifyDocumentCreate: sinon.spy(),
    notifyDocumentDelete: sinon.spy(),
    notifyDocumentReplace: sinon.spy(),
    notifyDocumentUpdate: sinon.spy(),
    publish: sinon.stub().returns(Promise.resolve(foo))
  };

  this.passport = {
    use: sinon.spy()
  };

  this.pluginsManager = {
    init: sinon.stub().returns(Promise.resolve()),
    packages: {
      bootstrap: sinon.stub().returns(Promise.resolve()),
      definitions: sinon.stub().returns(Promise.resolve([])),
      getPackage: sinon.stub().returns(Promise.resolve()),
    },
    plugins: {},
    run: sinon.stub().returns(Promise.resolve()),
    getPluginsConfig: sinon.stub().returns({}),
    trigger: sinon.spy(function () {return Promise.resolve(arguments[1]);})
  };

  this.cliController = {
    init: sinon.stub().returns(Promise.resolve()),
    actions: {
      adminExists: sinon.stub().returns(Promise.resolve()),
      createFirstAdmin: sinon.stub().returns(Promise.resolve()),
      cleanAndPrepare: sinon.stub().returns(Promise.resolve()),
      cleanDb: sinon.stub().returns(Promise.resolve()),
      managePlugins: sinon.stub().returns(Promise.resolve()),
      data: sinon.stub().returns(Promise.resolve()),
      dump: sinon.stub().returns(Promise.resolve())
    }
  };

  this.repositories = {
    init: sinon.stub().returns(Promise.resolve()),
    user: {
      load: sinon.stub().returns(Promise.resolve(foo))
    }
  };

  this.validation = {
    init: sinon.spy(),
    curateSpecification: sinon.spy(function () {return Promise.resolve();}),
    validate: sinon.spy(function () {return Promise.resolve(arguments[0]);}),
    validationPromise: sinon.spy(function () {return Promise.resolve(arguments[0]);}),
    addType: sinon.spy()
  };

  this.resetStorage = sinon.stub().returns(Promise.resolve());

  this.rootPath = '/kuzzle';

  this.router = {
    execute: sinon.stub().returns(Promise.resolve(foo)),
    init: sinon.spy(),
    newConnection: sinon.stub().returns(Promise.resolve(foo)),
    removeConnection: sinon.spy(),
  };

  this.services = {
    init: sinon.stub().returns(Promise.resolve()),
    list: {
      broker: {
        getInfos: sinon.stub().returns(Promise.resolve()),
        listen: sinon.spy(),
        send: sinon.spy()
      },
      gc: {
        init: sinon.spy(),
        run: sinon.stub().returns(Promise.resolve({ids: []}))
      },
      internalCache: {
        flushdb: sinon.stub().returns(Promise.resolve()),
        getInfos: sinon.stub().returns(Promise.resolve())
      },
      memoryStorage: {
        flushdb: sinon.stub().returns(Promise.resolve()),
        getInfos: sinon.stub().returns(Promise.resolve())
      },
      storageEngine: {
        get: sinon.stub().returns(Promise.resolve({
          _source: foo
        })),
        getInfos: sinon.stub().returns(Promise.resolve()),
        getMapping: sinon.stub().returns(Promise.resolve(foo)),
        listIndexes: sinon.stub().returns(Promise.resolve({indexes: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']})),
        collectionExists: sinon.stub().returns(Promise.resolve()),
        count: sinon.stub().returns(Promise.resolve(42)),
        create: sinon.stub().returns(Promise.resolve(foo)),
        createCollection: sinon.stub().returns(Promise.resolve(foo)),
        createIndex: sinon.stub().returns(Promise.resolve(foo)),
        createOrReplace: sinon.stub().returns(Promise.resolve(foo)),
        delete: sinon.stub().returns(Promise.resolve(foo)),
        deleteByQuery: sinon.stub().returns(Promise.resolve(Object.assign({}, foo, {ids: 'responseIds'}))),
        deleteByQueryFromTrash: sinon.stub().returns(Promise.resolve(Object.assign({}, foo, {ids: 'responseIds'}))),
        deleteIndex: sinon.stub().returns(Promise.resolve(foo)),
        deleteIndexes: sinon.stub().returns(Promise.resolve({deleted: ['a', 'e', 'i']})),
        getAutoRefresh: sinon.stub().returns(Promise.resolve(false)),
        import: sinon.stub().returns(Promise.resolve(foo)),
        indexExists: sinon.stub().returns(Promise.resolve()),
        listCollections: sinon.stub().returns(Promise.resolve()),
        refreshIndex: sinon.stub().returns(Promise.resolve(foo)),
        replace: sinon.stub().returns(Promise.resolve(foo)),
        search: sinon.stub().returns(Promise.resolve()),
        scroll: sinon.stub().returns(Promise.resolve()),
        setAutoRefresh: sinon.stub().returns(Promise.resolve(true)),
        truncateCollection: sinon.stub().returns(Promise.resolve(foo)),
        update: sinon.stub().returns(Promise.resolve(foo)),
        updateMapping: sinon.stub().returns(Promise.resolve(foo))
      }
    }
  };

  this.statistics = {
    getAllStats: sinon.stub().returns(Promise.resolve(foo)),
    getLastStats: sinon.stub().returns(Promise.resolve(foo)),
    getStats: sinon.stub().returns(Promise.resolve(foo)),
    init: sinon.spy()
  };
}

KuzzleMock.prototype = new Kuzzle();
KuzzleMock.prototype.constructor = Kuzzle;

module.exports = KuzzleMock;


