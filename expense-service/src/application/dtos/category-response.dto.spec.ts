import { CategoryResponseDto } from './category-response.dto';

describe('CategoryResponseDto', () => {
  it('has id name description active', () => {
    const dto = new CategoryResponseDto();
    dto.id = 'flight';
    dto.name = 'Flight';
    dto.description = 'Airfare expenses';
    dto.active = true;

    expect(dto.id).toBeDefined();
    expect(dto.name).toBeDefined();
    expect(dto.description).toBeDefined();
    expect(dto.active).toBeDefined();
    expect(dto.active).toBe(true);
  });
});
