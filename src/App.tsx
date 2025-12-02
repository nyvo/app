import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import SchedulePage from './pages/teacher/SchedulePage';
import SignupsPage from './pages/teacher/SignupsPage';
import MessagesPage from './pages/teacher/MessagesPage';
import NewCoursePage from './pages/teacher/NewCoursePage';
import CoursesPage from './pages/teacher/CoursesPage';
import CourseDetailPage from './pages/teacher/CourseDetailPage';
import PublicCoursesPage from './pages/public/PublicCoursesPage';
import PublicCourseDetailPage from './pages/public/PublicCourseDetailPage';
import TeacherProfilePage from './pages/teacher/TeacherProfilePage';
import StudentLoginPage from './pages/student/StudentLoginPage';
import StudentRegisterPage from './pages/student/StudentRegisterPage';
import NotFoundPage from './pages/NotFoundPage';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/teacher" replace />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/courses" element={<CoursesPage />} />
        <Route path="/teacher/courses/:id" element={<CourseDetailPage />} />
        <Route path="/teacher/schedule" element={<SchedulePage />} />
        <Route path="/teacher/signups" element={<SignupsPage />} />
        <Route path="/teacher/messages" element={<MessagesPage />} />
        <Route path="/teacher/new-course" element={<NewCoursePage />} />
        <Route path="/teacher/profile" element={<TeacherProfilePage />} />
        
        {/* Public Routes */}
        <Route path="/courses" element={<PublicCoursesPage />} />
        <Route path="/courses/detail" element={<PublicCourseDetailPage />} />

        {/* Student Routes */}
        <Route path="/student/login" element={<StudentLoginPage />} />
        <Route path="/student/register" element={<StudentRegisterPage />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
