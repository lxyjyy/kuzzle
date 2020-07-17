'use strict';

const should = require('should');
const sinon = require('sinon');
const {
  Request,
  errors: {
    BadRequestError,
    NotFoundError,
    SizeLimitError
  }
} = require('kuzzle-common-objects');

const KuzzleMock = require('../../../mocks/kuzzle.mock');

const HotelClerk = require('../../../../lib/core/realtime/hotelClerk');

describe('Test: hotelClerk.subscribe', () => {
  const connectionId = 'connectionid';
  let kuzzle;
  let hotelClerk;
  let request;
  let context;
  let realtimeModule;

  beforeEach(async () => {
    kuzzle = new KuzzleMock();
    realtimeModule = {
      notifier: {
        notifyUser: sinon.stub(),
      },
    };

    hotelClerk = new HotelClerk(kuzzle, realtimeModule);

    await hotelClerk.init();

    request = new Request({
      index: 'foo',
      collection: 'bar',
      controller: 'realtime',
      action: 'subscribe',
      body: {
        equals: {firstName: 'Ada'}
      },
      volatile: {
        foo: 'bar',
        bar: [ 'foo', 'bar', 'baz', 'qux']
      }
    }, {connectionId, token: null});

    kuzzle.config.limits.subscriptionMinterms = 0;
  });

  it('should register a "subscribe" event', async () => {
    sinon.stub(hotelClerk, 'subscribe');

    kuzzle.ask.restore();
    await kuzzle.ask('core:realtime:subscribe', 'foo');

    should(hotelClerk.subscribe).calledWith('foo');
  });

  it('should initialize base structures', () => {
    should(hotelClerk.rooms).be.empty();
    should(hotelClerk.customers).be.empty();
    should(hotelClerk.roomsCount).be.a.Number().and.be.eql(0);
  });

  it('should register a new room and customer', async () => {
    kuzzle.koncorde.normalize
      .onFirstCall().resolves({id: 'foobar'})
      .onSecondCall().resolves({id: 'barfoo'});

    kuzzle.koncorde.store
      .onFirstCall().returns({id: 'foobar'})
      .onSecondCall().returns({id: 'barfoo'});

    let response = await hotelClerk.subscribe(request);

    should(kuzzle.koncorde.normalize).calledOnce();
    should(kuzzle.koncorde.store).calledOnce();
    should(response.roomId).be.eql('foobar');
    should(response).have.property('channel');

    should(hotelClerk.roomsCount).be.eql(1);
    should(realtimeModule.notifier.notifyUser).calledWithMatch(
      'foobar',
      request,
      'in',
      { count: 1 });

    const roomId = hotelClerk.rooms.get(response.roomId).id;
    const customer = hotelClerk.customers.get(connectionId);

    should(customer).have.value(roomId, request.input.volatile);

    const room = hotelClerk.rooms.get(roomId);
    should(room.channels).be.an.Object().and.not.be.undefined();
    should(Object.keys(room.channels).length).be.exactly(1);

    const channel = Object.keys(room.channels)[0];
    should(room.channels[channel].scope).be.exactly('all');
    should(room.channels[channel].users).be.exactly('none');

    response = await hotelClerk.subscribe(request);

    should(kuzzle.koncorde.normalize.callCount).be.eql(2);
    should(kuzzle.koncorde.store.callCount).be.eql(2);
    should(response.roomId).be.eql('barfoo');
    should(hotelClerk.roomsCount).be.eql(2);
    should(realtimeModule.notifier.notifyUser).calledWithMatch(
      'barfoo',
      request,
      'in',
      { count: 1 });
  });

  it('should return the same response when the user has already subscribed to the filter', async () => {
    const firstResponse = await hotelClerk.subscribe(request);

    should(hotelClerk.roomsCount).be.eql(1);

    const secondResponse = await hotelClerk.subscribe(request);

    should(secondResponse).match(firstResponse);
    should(hotelClerk.roomsCount).be.eql(1);
    should(realtimeModule.notifier.notifyUser).calledWithMatch(
      secondResponse.roomId,
      request,
      'in',
      { count: 1 });
  });

  it('should reject when Koncorde throws an error', () => {
    kuzzle.koncorde.normalize.rejects(new Error('test'));

    return should(hotelClerk.subscribe(request)).be.rejected();
  });

  it('should reject if no index is provided', () => {
    request.input.resource.index = null;
    return should(hotelClerk.subscribe(request)).rejectedWith(BadRequestError, {
      id: 'api.assert.missing_argument',
    });
  });

  it('should reject with an error if no collection is provided', () => {
    request.input.resource.collection = null;

    return should(hotelClerk.subscribe(request)).rejectedWith(BadRequestError, {
      id: 'api.assert.missing_argument',
    });
  });

  it('should allow subscribing with an empty filter', async () => {
    request.input.body = {};

    const result = await hotelClerk.subscribe(request);

    should(hotelClerk.roomsCount).be.eql(1);
    should(realtimeModule.notifier.notifyUser).calledWithMatch(
      result.roomId,
      request,
      'in',
      { count: 1 });
  });

  it('should allow to subscribe to an existing room', async () => {
    let result;

    result = await hotelClerk.subscribe(request);
    const roomId = result.roomId;

    should(result).be.an.Object();
    should(result).have.property('channel');
    should(result).have.property('roomId');
    should(hotelClerk.roomsCount).be.eql(1);
    should(realtimeModule.notifier.notifyUser).calledWithMatch(
      roomId,
      request,
      'in',
      { count: 1 });

    const request2 = new Request({
      index: 'foo',
      collection: 'bar',
      controller: 'realtime',
      action: 'join',
      body: {
        roomId: result.roomId
      }
    }, {connectionId: 'connection2', user: null});

    request2.input.body = {roomId};

    result = await hotelClerk.join(request2);

    should(result).be.an.Object();
    should(result).have.property('roomId', roomId);
    should(result).have.property('channel');
    should(hotelClerk.roomsCount).be.eql(1);
    should(realtimeModule.notifier.notifyUser).calledWithMatch(
      roomId,
      request2,
      'in',
      { count: 2 });
  });

  it('#join should throw if the room does not exist', () => {
    const joinRequest = new Request({
      index: 'foo',
      collection: 'bar',
      controller: 'realtime',
      action: 'join',
      body: {roomId: 'i-exist'}
    }, context);

    return should(hotelClerk.join(joinRequest)).be.rejectedWith(NotFoundError, {
      id: 'core.realtime.room_not_found',
    });
  });

  it('#join should propagate notification only with "cluster" option', async () => {
    const joinRequest = new Request({
      index: 'foo',
      collection: 'bar',
      controller: 'realtime',
      action: 'join',
      body: {roomId: 'i-exist'}
    }, context);
    const response = { cluster: false, diff: 'diff', data: 'data'};
    hotelClerk.rooms.set('i-exist', {});
    sinon.stub(hotelClerk, '_subscribeToRoom').resolves(response);

    await hotelClerk.join(joinRequest);

    should(kuzzle.pipe).not.be.called();

    response.cluster = true;

    await hotelClerk.join(joinRequest);

    should(kuzzle.pipe).be.calledWith('core:hotelClerk:join', 'diff');
  });

  it('should reject the subscription if the given scope argument is incorrect', () => {
    request.input.args.scope = 'foo';

    return should(hotelClerk.subscribe(request)).rejectedWith(BadRequestError, {
      id: 'core.realtime.invalid_scope',
    });
  });

  it('should reject the subscription if the given users argument is incorrect', () => {
    request.input.args.users = 'foo';

    return should(hotelClerk.subscribe(request)).rejectedWith(BadRequestError, {
      id: 'core.realtime.invalid_users',
    });
  });

  it('should reject the subscription if the number of minterms exceeds the configured limit', () => {
    kuzzle.config.limits.subscriptionMinterms = 8;

    const normalized = [];
    for (let i = 0; i < 9; i++) {
      normalized.push([]);
    }

    kuzzle.koncorde.normalize.resolves({
      normalized,
      index: 'index',
      collection: 'collection',
      id: 'foobar',
    });

    return should(hotelClerk.subscribe(request)).rejectedWith(SizeLimitError, {
      id: 'core.realtime.too_many_terms',
    });
  });

  it('should refuse a subscription if the rooms limit has been reached', () => {
    hotelClerk.roomsCount = kuzzle.config.limits.subscriptionRooms;

    return should(hotelClerk.subscribe(request)).rejectedWith(SizeLimitError, {
      id: 'core.realtime.too_many_rooms',
    });
  });

  it('should impose no limit to the number of rooms if the limit is set to 0', () => {
    kuzzle.config.limits.subscriptionRooms = 0;
    hotelClerk.roomsCount = Number.MAX_SAFE_INTEGER - 1;

    return should(hotelClerk.subscribe(request)).be.fulfilled();
  });

  it('should discard the request if the associated connection is no longer active', async () => {
    kuzzle.router.isConnectionAlive.returns(false);
    sinon.stub(hotelClerk, '_createRoom');

    await hotelClerk.subscribe(request);

    should(hotelClerk._createRoom).not.called();
  });
});
