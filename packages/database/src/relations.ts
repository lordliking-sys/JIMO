import { relations } from 'drizzle-orm';
import {
  users,
  exercises,
  programs,
  programDays,
  programExercises,
  workoutSessions,
  workoutExercises,
  workoutSets,
  exerciseTranslations,
} from './schema';
export const usersRelations = relations(users, ({ many }) => ({
  programs: many(programs),
  sessions: many(workoutSessions),
  customExercises: many(exercises),
}));
export const exercisesRelations = relations(exercises, ({ one, many }) => ({
  translations: many(exerciseTranslations),
  owner: one(users, {
    fields: [exercises.createdByUserId],
    references: [users.id],
  }),
  programExercises: many(programExercises),
  workoutExercises: many(workoutExercises),
}));
export const programsRelations = relations(programs, ({ one, many }) => ({
  user: one(users, { fields: [programs.userId], references: [users.id] }),
  days: many(programDays),
  sessions: many(workoutSessions),
}));
export const programDaysRelations = relations(programDays, ({ one, many }) => ({
  program: one(programs, {
    fields: [programDays.programId],
    references: [programs.id],
  }),
  exercises: many(programExercises),
  sessions: many(workoutSessions),
}));
export const programExercisesRelations = relations(
  programExercises,
  ({ one, many }) => ({
    day: one(programDays, {
      fields: [programExercises.programDayId],
      references: [programDays.id],
    }),
    exercise: one(exercises, {
      fields: [programExercises.exerciseId],
      references: [exercises.id],
    }),
    workoutExercises: many(workoutExercises),
  }),
);
export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [workoutSessions.userId],
      references: [users.id],
    }),
    program: one(programs, {
      fields: [workoutSessions.programId],
      references: [programs.id],
    }),
    day: one(programDays, {
      fields: [workoutSessions.programDayId],
      references: [programDays.id],
    }),
    workoutExercises: many(workoutExercises),
  }),
);
export const workoutExercisesRelations = relations(
  workoutExercises,
  ({ one, many }) => ({
    session: one(workoutSessions, {
      fields: [workoutExercises.workoutSessionId],
      references: [workoutSessions.id],
    }),
    source: one(programExercises, {
      fields: [workoutExercises.programExerciseId],
      references: [programExercises.id],
    }),
    exercise: one(exercises, {
      fields: [workoutExercises.exerciseId],
      references: [exercises.id],
    }),
    sets: many(workoutSets),
  }),
);
export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  exercise: one(workoutExercises, {
    fields: [workoutSets.workoutExerciseId],
    references: [workoutExercises.id],
  }),
}));

export const exerciseTranslationsRelations = relations(
  exerciseTranslations,
  ({ one }) => ({
    exercise: one(exercises, {
      fields: [exerciseTranslations.exerciseId],
      references: [exercises.id],
    }),
  }),
);
