import { ChevronRight } from 'lucide-react';
import type { Course, CourseType } from '@/types/dashboard';

interface CoursesListProps {
  courses: Course[];
}

const getCourseColor = (type: CourseType): string => {
  const colors: Record<CourseType, string> = {
    private: 'bg-orange-300 ring-2 ring-orange-100',
    online: 'bg-purple-300 ring-2 ring-purple-100',
    yin: 'bg-[#4A6959] ring-2 ring-[#4A6959]/20',
    meditation: 'bg-blue-300 ring-2 ring-blue-100',
    vinyasa: 'bg-emerald-300 ring-2 ring-emerald-100',
    'course-series': 'bg-teal-300 ring-2 ring-teal-100',
  };
  return colors[type] || 'bg-stone-300';
};

export const CoursesList = ({ courses }: CoursesListProps) => {
  return (
    <div className="col-span-1 md:col-span-3 lg:col-span-4 rounded-3xl border border-[#E7E5E4] bg-white p-7 shadow-sm ios-ease hover:border-[#D6D3D1] hover:shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-geist text-sm font-semibold text-[#292524]">Dine kurs</h3>
        <div className="flex items-center gap-2">
          <button className="text-xs font-medium text-[#292524] bg-[#F7F5F2] px-3 py-1.5 rounded-lg hover:bg-[#E7E5E4] transition-colors">I dag</button>
          <button className="text-xs font-medium text-[#A8A29E] hover:text-[#57534E] px-2 transition-colors">Hele uken</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {courses.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-[#292524] mb-1">Ingen planlagte kurs</p>
            <p className="text-xs text-[#78716C]">Du har ingen planlagte kurs</p>
          </div>
        ) : (
          courses.map((course) => (
          <div key={course.id} className="flex items-center group p-1 rounded-xl transition-colors">
            <div className="w-14 text-sm font-medium text-[#A8A29E] flex-shrink-0 group-hover:text-[#78716C] transition-colors">
              {course.time}
            </div>
            <div className="flex-1 min-w-0 rounded-xl border border-[#F5F5F4] bg-[#FDFBF7]/50 p-3.5 transition-all hover:bg-white hover:border-[#D6D3D1] hover:shadow-sm cursor-pointer flex justify-between items-center group/card">
              <div className="flex items-center gap-3.5 min-w-0 overflow-hidden">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${getCourseColor(course.type)}`}></div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-[#292524] truncate group-hover/card:text-black">
                    {course.title}
                  </span>
                  <span className="text-xs text-[#78716C] truncate group-hover/card:text-[#57534E]">{course.subtitle}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#D6D3D1] group-hover/card:text-[#A8A29E] group-hover/card:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
            </div>
          </div>
        ))
        )}
      </div>
    </div>
  );
};
