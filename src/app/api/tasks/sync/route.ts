import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { googleTaskId, title, notes, status, due, userEmail } = body;

    if (!firestoreAdmin) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    if (!userEmail) {
      return NextResponse.json({ error: 'User Email is required' }, { status: 400 });
    }

    // 1. Resolve UserId by email
    const usersRef = firestoreAdmin.collection('users');
    const userSnapshot = await usersRef.where('email', '==', userEmail.toLowerCase()).limit(1).get();

    if (userSnapshot.empty) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnapshot.docs[0].data();
    const userId = userSnapshot.docs[0].id;
    const userName = `${userData.firstName} ${userData.lastName}`;

    // 2. Sync Task
    const tasksRef = firestoreAdmin.collection('tasks');
    const existingQuery = await tasksRef.where('googleTaskId', '==', googleTaskId).limit(1).get();

    const taskData: any = {
      googleTaskId,
      title,
      notes: notes || '',
      status: status || 'needsAction',
      userId,
      userName,
      updatedAt: Timestamp.now(),
    };

    if (due) {
      try {
        taskData.due = Timestamp.fromDate(new Date(due));
      } catch (e) {
        console.warn('Invalid due date format:', due);
      }
    }

    if (status === 'completed') {
      taskData.completedAt = Timestamp.now();
    }

    if (!existingQuery.empty) {
      const taskId = existingQuery.docs[0].id;
      const existingData = existingQuery.docs[0].data();
      
      // Se já estava concluída, mantém a data original de conclusão
      if (existingData.status === 'completed' && status === 'completed') {
        taskData.completedAt = existingData.completedAt;
      }
      
      await tasksRef.doc(taskId).update(taskData);
      return NextResponse.json({ message: 'Task updated', id: taskId });
    } else {
      const newTask = {
        ...taskData,
        createdAt: Timestamp.now(),
      };
      const res = await tasksRef.add(newTask);
      return NextResponse.json({ message: 'Task created', id: res.id });
    }
  } catch (error: any) {
    console.error('[Sync Tasks Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
