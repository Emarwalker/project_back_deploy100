const Faculty = require('../models/faculty.model');
const Major = require('../models/major.model');
const StudentDetails = require('../models/student_details.model');
const { Op } = require('sequelize');

const facultyController = {
  getAllFaculties: async (req, res) => {
    try {
      const faculties = await Faculty.findAll({
        attributes: ['id', 'name'],
        raw: true,
        order: [['name', 'ASC']]
      });
      res.json(faculties);
    } catch (error) {
      console.error('Error in getAllFaculties:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลคณะได้'
      });
    }
  },

  getMajorsByFaculty: async (req, res) => {
    try {
      const { facultyId } = req.params;
      const majors = await Major.findAll({
        where: { facultyId },
        attributes: ['id', 'name'],
        raw: true,
        order: [['name', 'ASC']]
      });
      res.json(majors);
    } catch (error) {
      console.error('Error in getMajorsByFaculty:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลสาขาได้'
      });
    }
  },

  getLoanStatsByMajor: async (req, res) => {
    try {
      // เปลี่ยนจาก faculty_id เป็น facultyId
      const majors = await Major.findAll({
        where: { facultyId: 1 },
        attributes: ['id', 'name']
      });

      const stats = await Promise.all(
        majors.map(async (major) => {
          const eligible = await StudentDetails.count({
            where: {
              major_id: major.id,
              total_hours: {
                [Op.gte]: 36
              }
            }
          });
          const total = await StudentDetails.count({
            where: { major_id: major.id }
          });
          return {
            name: major.name,
            eligible,
            total
          };
        })
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getLoanStatsByMajor:', error);
      res.status(500).json({
        success: false,
        message: 'ไม่สามารถดึงข้อมูลสถิติได้'
      });
    }
  }
};

module.exports = facultyController;