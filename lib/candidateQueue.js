export function shuffleDogs(dogs, previousDogId = null, random = Math.random) {
  const queue = [...dogs];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
  }

  if (queue.length > 1 && queue[0]?.id === previousDogId) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  return queue;
}

export function takeNextDog(queue, allDogs, previousDogId = null, random = Math.random) {
  const workingQueue = queue.length ? [...queue] : shuffleDogs(allDogs, previousDogId, random);
  const dog = workingQueue.shift();
  return { dog, queue: workingQueue };
}

