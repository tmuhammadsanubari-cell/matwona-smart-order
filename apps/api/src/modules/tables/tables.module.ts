import { Module } from '@nestjs/common';
import { PublicTablesController, TablesController } from './tables.controller.js';
import { TablesService } from './tables.service.js';

@Module({
  controllers: [PublicTablesController, TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
