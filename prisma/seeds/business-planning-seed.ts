import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedBusinessPlanning() {
  console.log('🌱 Seeding Business Planning Module...');

  try {
    // 1. Create Strategic Foundation
    console.log('Creating Strategic Foundation...');
    const foundation = await prisma.strategicFoundation.upsert({
      where: { id: 'strategic-foundation-1' },
      update: {},
      create: {
        id: 'strategic-foundation-1',
        vision: 'To be the leading steel fabrication company in the Middle East, recognized for innovation, quality, and sustainable practices.',
        mission: 'We deliver exceptional steel fabrication solutions that exceed client expectations through cutting-edge technology, skilled workforce, and unwavering commitment to safety and quality.',
        coreValues: [
          'Safety First',
          'Quality Excellence',
          'Innovation & Continuous Improvement',
          'Integrity & Transparency',
          'Customer Focus',
          'Teamwork & Collaboration',
          'Environmental Responsibility',
        ],
        bhag: 'By 2040, Hexa Steel will be the most technologically advanced and sustainable steel fabrication company in the region, with 50,000 tons annual capacity and zero environmental incidents.',
        threeYearOutlook: 'By 2028, achieve 30,000 tons annual capacity, ISO 9001/14001/45001 certifications, expand to 3 facilities, and establish digital twin manufacturing capabilities.',
        strategicPillars: [
          'Operational Excellence',
          'Quality & Safety Leadership',
          'Digital Transformation',
          'Market Expansion',
          'Talent Development',
          'Sustainability',
        ],
      },
    });
    console.log('✅ Strategic Foundation created');

    // 2. Create SWOT Analysis for 2025
    console.log('Creating SWOT Analysis for 2025...');
    const swot2025 = await prisma.swotAnalysis.upsert({
      where: { year: 2025 },
      update: {},
      create: {
        year: 2025,
        strengths: [
          'Experienced engineering team with 15+ years average experience',
          'State-of-the-art fabrication facility with modern equipment',
          'Strong reputation in the local market',
          'Established relationships with major clients',
          'Comprehensive quality management system',
          'Skilled welding workforce with international certifications',
        ],
        weaknesses: [
          'Limited digital transformation compared to international competitors',
          'Dependency on manual processes in some areas',
          'Limited marketing and brand awareness internationally',
          'Need for more automation in production',
          'Training programs need enhancement',
          'Supply chain vulnerabilities',
        ],
        opportunities: [
          'Growing infrastructure projects in the region',
          'Increasing demand for sustainable construction',
          'Digital transformation in manufacturing',
          'Export opportunities to neighboring countries',
          'Strategic partnerships with international firms',
          'Government support for local manufacturing',
        ],
        threats: [
          'Intense competition from international fabricators',
          'Fluctuating steel prices',
          'Economic uncertainties',
          'Skilled labor shortage',
          'Stringent environmental regulations',
          'Currency exchange rate volatility',
        ],
        strategies: [
          'Invest in digital manufacturing technologies (ERP, MES, IoT)',
          'Develop comprehensive training academy',
          'Pursue ISO certifications and international standards',
          'Expand marketing efforts to international markets',
          'Implement lean manufacturing principles',
          'Establish strategic partnerships for technology transfer',
        ],
      },
    });
    console.log('✅ SWOT Analysis 2025 created');

    // 3. Get a user for ownership (assuming admin user exists)
    const adminUser = await prisma.user.findFirst({
      where: { email: { contains: 'admin' } },
    });

    if (!adminUser) {
      console.log('⚠️  No admin user found. Skipping Annual Plan creation.');
      return;
    }

    // 4. Annual Plan (DEPRECATED - kept for historical reference)
    console.log('Note: Annual Plans are now deprecated. Objectives are top-level.');

    // 5. Create Company Objectives (OKRs)
    console.log('Creating Company Objectives...');
    
    // Financial Objective
    const financialObjective = await prisma.companyObjective.create({
      data: {
        year: 2025,
        title: 'Achieve 20% Revenue Growth',
        description: 'Increase annual revenue from $15M to $18M through market expansion and operational efficiency',
        category: 'Financial',
        ownerId: adminUser.id,
        tags: ['Revenue Growth', 'Market Expansion'],
        priority: 'Critical',
        status: 'On Track',
        progress: 35,
        quarterlyActions: {
          Q1: ['Launch new marketing campaign', 'Identify 10 target clients'],
          Q2: ['Close 2 major deals', 'Expand sales team'],
          Q3: ['Enter new market segment', 'Optimize pricing strategy'],
          Q4: ['Review annual performance', 'Plan 2026 growth strategy'],
        },
        keyResults: {
          create: [
            {
              title: 'Increase total project value to $18M',
              targetValue: 18000000,
              currentValue: 5250000,
              unit: '$',
              measurementType: 'Numeric',
              status: 'On Track',
            },
            {
              title: 'Secure 5 new major clients',
              targetValue: 5,
              currentValue: 2,
              unit: 'clients',
              measurementType: 'Numeric',
              status: 'On Track',
            },
            {
              title: 'Achieve 15% profit margin',
              targetValue: 15,
              currentValue: 12,
              unit: '%',
              measurementType: 'Numeric',
              status: 'At Risk',
            },
          ],
        },
      },
    });

    // Customer Objective
    const customerObjective = await prisma.companyObjective.create({
      data: {
        year: 2025,
        title: 'Achieve 95% Customer Satisfaction',
        description: 'Deliver exceptional quality and service to achieve industry-leading customer satisfaction',
        category: 'Customer',
        ownerId: adminUser.id,
        tags: ['Customer Experience', 'Quality'],
        priority: 'High',
        status: 'On Track',
        progress: 60,
        quarterlyActions: {
          Q1: ['Implement customer feedback system', 'Train customer service team'],
          Q2: ['Launch quality improvement program', 'Reduce NCR by 20%'],
          Q3: ['Achieve 95% on-time delivery', 'Customer satisfaction survey'],
          Q4: ['Year-end customer appreciation event', 'Review and improve processes'],
        },
        keyResults: {
          create: [
            {
              title: 'Customer satisfaction score ≥ 95%',
              targetValue: 95,
              currentValue: 88,
              unit: '%',
              measurementType: 'Numeric',
              status: 'On Track',
            },
            {
              title: 'On-time delivery rate ≥ 98%',
              targetValue: 98,
              currentValue: 92,
              unit: '%',
              measurementType: 'Numeric',
              status: 'At Risk',
            },
            {
              title: 'Zero critical NCRs',
              targetValue: 0,
              currentValue: 2,
              unit: 'NCRs',
              measurementType: 'Numeric',
              status: 'Behind',
            },
          ],
        },
      },
    });

    // Internal Process Objective
    const processObjective = await prisma.companyObjective.create({
      data: {
        year: 2025,
        title: 'Implement Digital Manufacturing System',
        description: 'Deploy comprehensive ERP and MES to digitize all operations',
        category: 'Internal Process',
        ownerId: adminUser.id,
        tags: ['Digital Transformation', 'Operational Excellence'],
        priority: 'Critical',
        status: 'On Track',
        progress: 45,
        quarterlyActions: {
          Q1: ['Complete ERP vendor selection', 'Define system requirements'],
          Q2: ['Begin ERP implementation', 'Train core team'],
          Q3: ['Deploy ERP modules', 'Integrate with production'],
          Q4: ['Go-live and stabilization', 'Measure efficiency gains'],
        },
        keyResults: {
          create: [
            {
              title: 'Complete ERP implementation',
              targetValue: 100,
              currentValue: 45,
              unit: '%',
              measurementType: 'Numeric',
              status: 'On Track',
            },
            {
              title: 'Digitize 100% of production processes',
              targetValue: 100,
              currentValue: 30,
              unit: '%',
              measurementType: 'Numeric',
              status: 'On Track',
            },
            {
              title: 'Reduce manual data entry by 80%',
              targetValue: 80,
              currentValue: 25,
              unit: '%',
              measurementType: 'Numeric',
              status: 'On Track',
            },
          ],
        },
      },
    });

    // Learning & Growth Objective
    const learningObjective = await prisma.companyObjective.create({
      data: {
        year: 2025,
        title: 'Build World-Class Workforce',
        description: 'Develop comprehensive training programs and achieve international certifications',
        category: 'Learning & Growth',
        ownerId: adminUser.id,
        tags: ['Training', 'Certifications', 'Talent Development'],
        priority: 'High',
        status: 'On Track',
        progress: 40,
        quarterlyActions: {
          Q1: ['Launch training academy', 'Enroll 50 welders in AWS program'],
          Q2: ['Complete ISO 9001 gap analysis', 'Implement quality procedures'],
          Q3: ['AWS certification exams', 'ISO 9001 internal audit'],
          Q4: ['ISO 9001 certification audit', 'Year-end performance reviews'],
        },
        keyResults: {
          create: [
            {
              title: 'Train 100% of welders to AWS standards',
              targetValue: 100,
              currentValue: 65,
              unit: '%',
              measurementType: 'Numeric',
              status: 'On Track',
            },
            {
              title: 'Achieve ISO 9001:2015 certification',
              targetValue: 1,
              currentValue: 0,
              unit: 'certification',
              measurementType: 'Milestone',
              status: 'On Track',
            },
            {
              title: 'Reduce employee turnover to <10%',
              targetValue: 10,
              currentValue: 15,
              unit: '%',
              measurementType: 'Numeric',
              status: 'At Risk',
            },
          ],
        },
      },
    });

    console.log('✅ Company Objectives created');

    // 6. Create Balanced Scorecard KPIs
    console.log('Creating BSC KPIs...');
    
    await prisma.balancedScorecardKPI.createMany({
      data: [
        // Financial KPIs
        {
          year: 2025,
          objectiveId: financialObjective.id,
          name: 'Revenue Growth Rate',
          description: 'Year-over-year revenue growth percentage',
          category: 'Financial',
          targetValue: 20,
          currentValue: 12,
          unit: '%',
          frequency: 'Quarterly',
          ownerId: adminUser.id,
          formula: '((Current Year Revenue - Previous Year Revenue) / Previous Year Revenue) * 100',
          status: 'On Track',
        },
        {
          year: 2025,
          objectiveId: financialObjective.id,
          name: 'Profit Margin',
          description: 'Net profit as percentage of revenue',
          category: 'Financial',
          targetValue: 15,
          currentValue: 12,
          unit: '%',
          frequency: 'Monthly',
          ownerId: adminUser.id,
          formula: '(Net Profit / Revenue) * 100',
          status: 'At Risk',
        },
        {
          year: 2025,
          objectiveId: financialObjective.id,
          name: 'Cost per Ton',
          description: 'Average fabrication cost per ton',
          category: 'Financial',
          targetValue: 1200,
          currentValue: 1350,
          unit: '$/ton',
          frequency: 'Monthly',
          ownerId: adminUser.id,
          formula: 'Total Fabrication Cost / Total Tonnage',
          status: 'Behind',
        },
        // Customer KPIs
        {
          year: 2025,
          objectiveId: customerObjective.id,
          name: 'Customer Satisfaction Score',
          description: 'Average customer satisfaction rating',
          category: 'Customer',
          targetValue: 95,
          currentValue: 88,
          unit: '%',
          frequency: 'Quarterly',
          ownerId: adminUser.id,
          formula: 'Average of customer survey scores',
          status: 'On Track',
        },
        {
          year: 2025,
          objectiveId: customerObjective.id,
          name: 'On-Time Delivery Rate',
          description: 'Percentage of projects delivered on schedule',
          category: 'Customer',
          targetValue: 98,
          currentValue: 92,
          unit: '%',
          frequency: 'Monthly',
          ownerId: adminUser.id,
          formula: '(Projects Delivered On Time / Total Projects) * 100',
          status: 'At Risk',
        },
        {
          year: 2025,
          objectiveId: customerObjective.id,
          name: 'Customer Retention Rate',
          description: 'Percentage of repeat customers',
          category: 'Customer',
          targetValue: 85,
          currentValue: 78,
          unit: '%',
          frequency: 'Quarterly',
          ownerId: adminUser.id,
          formula: '(Repeat Customers / Total Customers) * 100',
          status: 'On Track',
        },
        // Internal Process KPIs
        {
          year: 2025,
          objectiveId: processObjective.id,
          name: 'Production Efficiency',
          description: 'Actual output vs planned output',
          category: 'Internal Process',
          targetValue: 90,
          currentValue: 82,
          unit: '%',
          frequency: 'Monthly',
          ownerId: adminUser.id,
          formula: '(Actual Tonnage / Planned Tonnage) * 100',
          status: 'On Track',
        },
        {
          year: 2025,
          objectiveId: processObjective.id,
          name: 'NCR Rate',
          description: 'Non-conformance reports per 100 tons',
          category: 'Internal Process',
          targetValue: 2,
          currentValue: 4.5,
          unit: 'NCRs/100tons',
          frequency: 'Monthly',
          ownerId: adminUser.id,
          formula: '(Total NCRs / Total Tonnage) * 100',
          status: 'Behind',
        },
        {
          year: 2025,
          objectiveId: processObjective.id,
          name: 'First-Time Quality Rate',
          description: 'Percentage of work passing QC first time',
          category: 'Internal Process',
          targetValue: 95,
          currentValue: 88,
          unit: '%',
          frequency: 'Monthly',
          ownerId: adminUser.id,
          formula: '(Parts Passing First QC / Total Parts) * 100',
          status: 'On Track',
        },
        // Learning & Growth KPIs
        {
          year: 2025,
          objectiveId: learningObjective.id,
          name: 'Employee Training Hours',
          description: 'Average training hours per employee per year',
          category: 'Learning & Growth',
          targetValue: 40,
          currentValue: 18,
          unit: 'hours',
          frequency: 'Quarterly',
          ownerId: adminUser.id,
          formula: 'Total Training Hours / Total Employees',
          status: 'Behind',
        },
        {
          year: 2025,
          objectiveId: learningObjective.id,
          name: 'Employee Turnover Rate',
          description: 'Percentage of employees leaving annually',
          category: 'Learning & Growth',
          targetValue: 10,
          currentValue: 15,
          unit: '%',
          frequency: 'Quarterly',
          ownerId: adminUser.id,
          formula: '(Employees Left / Average Employees) * 100',
          status: 'At Risk',
        },
        {
          year: 2025,
          objectiveId: learningObjective.id,
          name: 'Certified Welders Percentage',
          description: 'Percentage of welders with international certifications',
          category: 'Learning & Growth',
          targetValue: 100,
          currentValue: 65,
          unit: '%',
          frequency: 'Quarterly',
          ownerId: adminUser.id,
          formula: '(Certified Welders / Total Welders) * 100',
          status: 'On Track',
        },
      ],
    });

    console.log('✅ BSC KPIs created');

    // 7. Create Annual Initiatives
    console.log('Creating Annual Initiatives...');
    
    await prisma.annualInitiative.createMany({
      data: [
        {
          year: 2025,
          objectiveId: processObjective.id,
          name: 'ERP System Implementation',
          description: 'Deploy comprehensive ERP system covering all business processes',
          expectedImpact: 'Reduce manual work by 80%, improve data accuracy, enable real-time reporting',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          ownerId: adminUser.id,
          status: 'In Progress',
          progress: 45,
          budget: 500000,
        },
        {
          year: 2025,
          objectiveId: learningObjective.id,
          name: 'ISO 9001:2015 Certification',
          description: 'Achieve ISO 9001:2015 quality management certification',
          expectedImpact: 'Improve quality processes, increase customer confidence, enable international contracts',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-10-31'),
          ownerId: adminUser.id,
          status: 'In Progress',
          progress: 40,
          budget: 150000,
        },
        {
          year: 2025,
          objectiveId: learningObjective.id,
          name: 'Welding Training Academy',
          description: 'Establish comprehensive welding training center with AWS certification',
          expectedImpact: 'Improve welder skills, reduce NCRs, achieve international standards',
          startDate: new Date('2025-02-01'),
          endDate: new Date('2025-11-30'),
          ownerId: adminUser.id,
          status: 'In Progress',
          progress: 30,
          budget: 200000,
        },
        {
          year: 2025,
          objectiveId: financialObjective.id,
          name: 'Market Expansion - UAE',
          description: 'Establish presence in UAE market through partnerships',
          expectedImpact: 'Access to $5M additional annual revenue, diversify client base',
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-12-31'),
          ownerId: adminUser.id,
          status: 'Planned',
          progress: 10,
          budget: 100000,
        },
        {
          year: 2025,
          objectiveId: processObjective.id,
          name: 'Lean Manufacturing Implementation',
          description: 'Implement 5S, Kaizen, and lean principles across production',
          expectedImpact: 'Reduce waste by 30%, improve efficiency by 25%, reduce costs',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-12-31'),
          ownerId: adminUser.id,
          status: 'Planned',
          progress: 5,
          budget: 75000,
        },
      ],
    });

    console.log('✅ Annual Initiatives created');

    console.log('✅ Business Planning Module seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding Business Planning Module:', error);
    throw error;
  }
}

// Run seed if called directly
seedBusinessPlanning()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
