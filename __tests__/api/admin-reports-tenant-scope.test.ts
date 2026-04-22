function buildBookingTourScopeStages(
  effectiveTenantId: string | undefined,
  asField = 'tourDetails',
) {
  if (effectiveTenantId === 'default') {
    return [];
  }

  if (!effectiveTenantId) {
    return [
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: asField,
        },
      },
      {
        $unwind: {
          path: `$${asField}`,
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: [`$${asField}.tenantId`, '$tenantId'] },
              {
                $in: [
                  '$tenantId',
                  { $ifNull: [`$${asField}.tenantIds`, []] },
                ],
              },
            ],
          },
        },
      },
    ];
  }

  return [
    {
      $lookup: {
        from: 'tours',
        localField: 'tour',
        foreignField: '_id',
        as: asField,
      },
    },
    {
      $unwind: {
        path: `$${asField}`,
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        $or: [
          { [`${asField}.tenantId`]: effectiveTenantId },
          { [`${asField}.tenantIds`]: effectiveTenantId },
        ],
      },
    },
  ];
}

describe('Admin reports tenant tour scope', () => {
  it('adds a booking-to-tour tenant integrity stage for all-brand reports', () => {
    expect(buildBookingTourScopeStages(undefined)).toEqual([
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: 'tourDetails',
        },
      },
      {
        $unwind: {
          path: '$tourDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ['$tourDetails.tenantId', '$tenantId'] },
              {
                $in: ['$tenantId', { $ifNull: ['$tourDetails.tenantIds', []] }],
              },
            ],
          },
        },
      },
    ]);
  });

  it('adds no extra tour filter for default reports', () => {
    expect(buildBookingTourScopeStages('default')).toEqual([]);
  });

  it('narrows branded reports to tours assigned to the same tenant', () => {
    expect(buildBookingTourScopeStages('makadi-bay')).toEqual([
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: 'tourDetails',
        },
      },
      {
        $unwind: {
          path: '$tourDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { 'tourDetails.tenantId': 'makadi-bay' },
            { 'tourDetails.tenantIds': 'makadi-bay' },
          ],
        },
      },
    ]);
  });

  it('supports custom lookup aliases for pipelines that already join tours', () => {
    expect(buildBookingTourScopeStages('el-gouna', 'joinedTour')).toEqual([
      {
        $lookup: {
          from: 'tours',
          localField: 'tour',
          foreignField: '_id',
          as: 'joinedTour',
        },
      },
      {
        $unwind: {
          path: '$joinedTour',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { 'joinedTour.tenantId': 'el-gouna' },
            { 'joinedTour.tenantIds': 'el-gouna' },
          ],
        },
      },
    ]);
  });
});
