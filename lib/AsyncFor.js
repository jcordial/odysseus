/**
 * @extends {AsyncIterableIterator.<T>}
 * @template T
 */
class AsyncFor {
  /**
   * @param {GeneratorFunction<*, void, ?>} provider
   */
  constructor(provider) {
    this._generator = provider;
  }

  /**
   * @param {number} batchSize
   * @param {number} pageOffset
   * @param {function(batchSize:number, page:number):Promise.<T[]>} getter
   * @return {AsyncFor.<T>}
   */
  static batch(batchSize, pageOffset = 0, getter) {
    let fetched = [];
    let isLastBatch;
    let currentPage = pageOffset;

    async function* batchProvider() {
      do {
        if (fetched.length === 0) {
          if (isLastBatch) {
            break;
          }
          fetched = await getter(batchSize, currentPage);
          if (fetched.length === 0) {
            break;
          }
          if (fetched.length !== batchSize) {
            isLastBatch = true;
          }
          currentPage++;
        }
        yield fetched.shift();
      } while (fetched.length > 0);
    }

    return new AsyncFor(batchProvider);
  }

  /**
   * @template O
   * @param {Iterator.<O>|AsyncIterable.<O>}array
   * @return {AsyncFor.<O>}
   */
  static from(array) {
    const source = [...array];

    function* fromProvider() {
      while (source.length > 0) {
        yield source.shift();
      }
    }

    return new AsyncFor(fromProvider);
  }

  /**
   *
   * @param {AsyncIterator} first
   * @param {AsyncIterator} rest
   * @return {AsyncFor}
   */
  static concat(first, ...rest) {
    return first.concat(...rest);
  }

  forEach(work) {
    const iterator = this;

    async function* forEachProvider() {
      for await (const item of iterator) {
        await work(item);
        yield item;
      }
    }

    return new AsyncFor(forEachProvider);
  }

  concat(...iterators) {
    const previous = this;

    async function* concatProvider() {
      for await (const item of previous) {
        yield item;
      }
      for (const nexIterator of iterators) {
        for await (const item of nexIterator) {
          yield item;
        }
      }
    }

    return new AsyncFor(concatProvider);
  }

  /**
   * @param {function(item:T):(bool|Promise<bool>)} filter
   * @return {AsyncFor.<T>}
   */
  filter(filter) {
    const iterator = this;

    async function* filterProvider() {
      for await (const item of iterator) {
        const keep = filter(item);
        if (keep) {
          yield item;
        }
      }
    }

    return new AsyncFor(filterProvider);
  }

  map(transform) {
    const iterator = this;

    async function* mapProvider() {
      for await (const next of iterator) {
        yield transform(next);
      }
    }

    return new AsyncFor(mapProvider);
  }

  collect(size = 1) {
    let queue = [];
    let done = false;
    const previousIterator = this;

    async function* collectProvider() {
      if (done) {
        return;
      }
      for await (const next of previousIterator) {
        queue.push(next);
        if (queue.length === size) {
          yield queue;
          queue = [];
        }
      }
      done = true;
      if (queue.length > 0) {
        yield queue;
      }
    }

    return new AsyncFor(collectProvider);
  }

  //
  // then(callback, errCallback) {
  //   return new Promise(async (res, rej) => {
  //     try {
  //       await this.toArray();
  //       res(true);
  //     } catch (e) {
  //       rej(e);
  //     }
  //   }).then(callback, errCallback);
  // }

  /**
   * @return {Promise<T[]>}
   */
  async toArray() {
    const collection = [];
    for await (const nextItem of this) {
      collection.push(nextItem);
    }
    return collection;
  }

  /**
   * @return {Promise<IteratorResult<T>> | Promise<IteratorResult<T, any>>}
   */
  next() {
    const provider = this._generator();
    this.next = () => provider.next();
    return this.next();
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}


module.exports = AsyncFor;
