import { Difficulty, Operation, Question } from '../types';

export const generateQuestions = (difficulty: Difficulty, operation: Operation, count: number = 10): Question[] => {
  const questions: Question[] = [];

  for (let i = 0; i < count; i++) {
    let num1 = 0;
    let num2 = 0;
    let answer = 0;

    switch (difficulty) {
      case Difficulty.BEGINNER:
        if (operation === Operation.MULTIPLICATION) {
          num1 = getRandomInt(1, 9);
          num2 = getRandomInt(1, 9);
        } else if (operation === Operation.DIVISION) {
          num2 = getRandomInt(1, 9);
          answer = getRandomInt(1, 9);
          num1 = num2 * answer;
        } else {
          num1 = getRandomInt(1, 20);
          num2 = getRandomInt(1, 10);
        }
        break;
      
      case Difficulty.INTERMEDIATE:
        if (operation === Operation.MULTIPLICATION) {
          num1 = getRandomInt(5, 15);
          num2 = getRandomInt(2, 12);
        } else if (operation === Operation.DIVISION) {
          num2 = getRandomInt(2, 12);
          answer = getRandomInt(2, 15);
          num1 = num2 * answer;
        } else {
          num1 = getRandomInt(20, 100);
          num2 = getRandomInt(10, 50);
        }
        break;

      case Difficulty.EXPERT:
        if (operation === Operation.MULTIPLICATION) {
          num1 = getRandomInt(10, 50);
          num2 = getRandomInt(5, 20);
        } else if (operation === Operation.DIVISION) {
          num2 = getRandomInt(5, 25);
          answer = getRandomInt(5, 50);
          num1 = num2 * answer;
        } else {
          num1 = getRandomInt(100, 1000);
          num2 = getRandomInt(50, 500);
        }
        break;
    }

    // Adjust for subtraction to avoid negative numbers for beginners if desired, 
    // but standard math games often allow it. However, for primary ed, usually num1 > num2.
    if (operation === Operation.SUBTRACTION && num1 < num2) {
      [num1, num2] = [num2, num1];
    }

    // Calculate correct answer
    switch (operation) {
      case Operation.ADDITION: answer = num1 + num2; break;
      case Operation.SUBTRACTION: answer = num1 - num2; break;
      case Operation.MULTIPLICATION: answer = num1 * num2; break;
      case Operation.DIVISION: answer = num1 / num2; break;
    }

    questions.push({
      id: i + 1,
      num1,
      num2,
      operation,
      correctAnswer: answer
    });
  }

  return questions;
};

const getRandomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const getOperationSymbol = (op: Operation): string => {
  switch (op) {
    case Operation.ADDITION: return '+';
    case Operation.SUBTRACTION: return '-';
    case Operation.MULTIPLICATION: return '×';
    case Operation.DIVISION: return '÷';
  }
};