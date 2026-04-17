
async function testJoin() {
  const SERVER_URL = 'http://localhost:5001';
  let teacherCookies: string[] = [];
  let studentCookies: string[] = [];
  
  // 1. Register Teacher
  let res = await fetch(`${SERVER_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: 'test_teacher_' + Date.now(), 
      password: 'password123', 
      name: 'Test Teacher', 
      email: Date.now() + '@teacher.com', 
      role: 'teacher' 
    })
  });
  teacherCookies = res.headers.getSetCookie() || [];
  let teacherData = await res.json();
  console.log('Teacher Register:', teacherData);

  // 2. Create Class
  res = await fetch(`${SERVER_URL}/api/classes`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': teacherCookies.join(';')
    },
    body: JSON.stringify({
      title: 'Bug Test Class',
      subject: 'Math',
      scheduleTime: 'TBD'
    })
  });
  let classData = await res.json();
  console.log('Class Create:', classData);
  const joinCode = classData.joinCode;

  // 3. Register Student
  res = await fetch(`${SERVER_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: 'test_student_' + Date.now(), 
      password: 'password123', 
      name: 'Test Student', 
      email: Date.now() + '@student.com', 
      role: 'student' 
    })
  });
  studentCookies = res.headers.getSetCookie() || [];
  let studentData = await res.json();
  console.log('Student Register:', studentData);

  // 4. Try Joining
  res = await fetch(`${SERVER_URL}/api/classes/join`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': studentCookies.join(';')
    },
    body: JSON.stringify({ joinCode })
  });
  
  console.log('Join Response Status:', res.status, res.statusText);
  let joinData = await res.json();
  console.log('Join Response Body:', joinData);
}

testJoin().catch(console.error);
