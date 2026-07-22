import { prisma } from "../config/prisma.js";

import { ParentRelationship } from "@prisma/client";

export interface CreateParentStudentInput {

  parentId: string;

  studentId: string;

  relationship: ParentRelationship;

}

export async function createParentStudent(

  data: CreateParentStudentInput

) {

  const parent = await prisma.parent.findUnique({

    where: {

      id: data.parentId,

    },

  });

  if (!parent) {

    throw new Error("Parent not found.");

  }

  const student = await prisma.student.findUnique({

    where: {

      id: data.studentId,

    },

  });

  if (!student) {

    throw new Error("Student not found.");

  }

  const existing = await prisma.parentStudent.findUnique({

    where: {

      parentId_studentId: {

        parentId: data.parentId,

        studentId: data.studentId,

      },

    },

  });

  if (existing) {

    throw new Error(

      "Parent is already linked to this student."

    );

  }

  const relationship =

    await prisma.parentStudent.create({

      data,

      include: {

        parent: {

          select: {

            fullName: true,

          },

        },

        student: {

          select: {

            fullName: true,

            studentId: true,

          },

        },

      },

    });

  return relationship;

}

export async function getStudentsByParent(
  parentId: string
) {
  const parent = await prisma.parent.findUnique({
    where: {
      id: parentId,
    },
  });

  if (!parent) {
    throw new Error("Parent not found.");
  }

  const students = await prisma.parentStudent.findMany({
    where: {
      parentId,
    },
    select: {
      relationship: true,

      student: {
        select: {
          id: true,
          studentId: true,
          fullName: true,
          avatar: true,

          class: {
            select: {
              className: true,
              yearLevel: true,
            },
          },
        },
      },
    },
    orderBy: {
      student: {
        fullName: "asc",
      },
    },
  });

  return students;
}

export async function getParentsByStudent(
  studentId: string
) {
  const student = await prisma.student.findUnique({
    where: {
      id: studentId,
    },
  });

  if (!student) {
    throw new Error("Student not found.");
  }

  const parents = await prisma.parentStudent.findMany({
    where: {
      studentId,
    },
    select: {
      relationship: true,

      parent: {
        select: {
          id: true,
          fullName: true,
          phone: true,
          occupation: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      parent: {
        fullName: "asc",
      },
    },
  });

  return parents;
}

export interface UpdateParentStudentInput {
  relationship: ParentRelationship;
}

export async function updateParentStudent(
  id: string,
  data: UpdateParentStudentInput
) {
  const link = await prisma.parentStudent.findUnique({
    where: {
      id,
    },
  });

  if (!link) {
    throw new Error("Parent-student relationship not found.");
  }

  const updated = await prisma.parentStudent.update({
    where: {
      id,
    },
    data: {
      relationship: data.relationship,
    },
    include: {
      parent: {
        select: {
          fullName: true,
        },
      },
      student: {
        select: {
          studentId: true,
          fullName: true,
        },
      },
    },
  });

  return updated;
}

export async function deleteParentStudent(id: string) {
  const link = await prisma.parentStudent.findUnique({
    where: {
      id,
    },
  });

  if (!link) {
    throw new Error("Parent-student relationship not found.");
  }

  await prisma.parentStudent.delete({
    where: {
      id,
    },
  });

  return null;
}