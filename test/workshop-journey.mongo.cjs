const root = process.cwd();
const assert = require('node:assert/strict');
const mongoose = require(root + '/node_modules/mongoose');
const { Workshop, WorkshopSchema } = require(
  root + '/src/navigation/schemas/workshop.schema'
);
const { SectionSchema } = require(
  root + '/src/navigation/schemas/section.schema'
);
const { WorkshopPageSchema } = require(
  root + '/src/workshop-page/schemas/workshop-page.schema'
);
const { WorkshopDocumentService } = require(
  root + '/src/workshop-page/workshop-page.service'
);
const { NavigationService } = require(
  root + '/src/navigation/navigation.service'
);
(async () => {
  const db = 'document_journey_check_' + Date.now();
  await mongoose.connect('mongodb://127.0.0.1:27017/' + db, {
    serverSelectionTimeoutMS: 2000,
  });
  try {
    const workshopModel = mongoose.model('Workshop', WorkshopSchema);
    const sectionModel = mongoose.model('Section', SectionSchema);
    const pageModel = mongoose.model('WorkshopPage', WorkshopPageSchema);
    const pages = new WorkshopDocumentService(pageModel);
    const service = new NavigationService(sectionModel, workshopModel, pages);
    let workshop = await service.createWorkshop({
      sectionId: 'angular',
      name: 'Journey',
      summary: 'Learning',
    });
    assert.equal(workshop.workshopDocuments[0].kind, 'PAGE');
    const workshopId = workshop._id;
    await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        service.addReference({
          workshopId,
          kind: index % 2 ? 'CODING_LAB' : 'ASSESSMENT_TEST',
          resourceId: '$opaque',
          name: '$Label',
        })
      )
    );
    workshop = (await service.findAllWorkshopsInSection('angular'))[0];
    assert.equal(workshop.workshopDocuments.length, 9);
    assert.equal(
      new Set(workshop.workshopDocuments.map((item) => item.sortId)).size,
      9
    );
    assert.equal(
      new Set(workshop.workshopDocuments.map((item) => item._id)).size,
      9
    );
    assert.equal(workshop.workshopDocuments[1].resourceId, '$opaque');
    const expectedFirstId = workshop.workshopDocuments.at(-1)._id;
    workshop = await service.sortPages(
      [...workshop.workshopDocuments].reverse(),
      workshopId
    );
    assert.equal(workshop.workshopDocuments[0]._id, expectedFirstId);
    assert.deepEqual(
      workshop.workshopDocuments.map((item) => item.sortId),
      [0, 1, 2, 3, 4, 5, 6, 7, 8]
    );
    const originalUpdate = workshopModel.findOneAndUpdate;
    workshopModel.findOneAndUpdate = async function (filter, ...args) {
      if ('__v' in filter)
        await service.addReference({
          workshopId,
          kind: 'CODING_LAB',
          resourceId: 'concurrent',
          name: 'Concurrent',
        });
      return originalUpdate.call(this, filter, ...args);
    };
    await assert.rejects(
      service.sortPages(workshop.workshopDocuments, workshopId),
      (error) => error.getStatus() === 409
    );
    workshopModel.findOneAndUpdate = originalUpdate;
    workshop = (await service.findAllWorkshopsInSection('angular'))[0];
    assert.equal(workshop.workshopDocuments.at(-1).resourceId, 'concurrent');
    const entry = workshop.workshopDocuments[0];
    workshop = await service.editPageNameUpdateWorkshop({
      workshopId,
      _id: entry._id,
      name: 'New label',
    });
    assert.equal(workshop.workshopDocuments[0].name, 'New label');
    await service.deletePageAndUpdateWorkshop(entry._id, workshopId);
    assert.equal(await pageModel.countDocuments(), 1);
    workshop = await service.createPage({ workshopId, name: 'Closing page' });
    assert.equal(
      new Set(workshop.workshopDocuments.map((item) => item.sortId)).size,
      workshop.workshopDocuments.length
    );
    assert.equal(await pageModel.countDocuments(), 2);
    await service.deleteWorkshopAndWorkshopDocuments(workshopId);
    assert.equal(await pageModel.countDocuments(), 0);
    assert.equal(await workshopModel.countDocuments(), 0);
    console.log(
      'PASS isolated MongoDB: mixed round-trip, 8 concurrent appends, repeated/dollar-prefixed IDs, reorder/conflict, rename, unlink, page append, owned-page cascade'
    );
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
