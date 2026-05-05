export const inlineStyle_133_10 = {
  width: '100%',
  marginTop: 8,
};

export const inlineStyle_134_12 = {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
};

export const inlineStyle_135_14 = {
  flex: 1,
  fontWeight: '600',
};

export const inlineStyle_139_10 = {
  backgroundColor: '#000',
  paddingVertical: 8,
  paddingHorizontal: 12,
  borderRadius: 6,
};

export const inlineStyle_145_16 = {
  color: '#fff',
};

export const inlineStyle_149_25 = {
  color: '#1b7f34',
  marginBottom: 6,
};

export const inlineStyle_150_24 = {
  color: '#b00020',
  marginBottom: 6,
};

export const inlineStyle_153_14 = {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 10,
};

export const inlineStyle_154_16 = {
  color: '#666',
};

export const inlineStyle_158_16 = {
  flexDirection: 'row',
  gap: 10,
};

export const inlineStyle_164_18 = {
  width: 170,
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 8,
  backgroundColor: '#fff',
};

export const inlineStyle_173_20 = {
  height: 120,
  backgroundColor: '#f5f5f5',
  borderRadius: 6,
  overflow: 'hidden',
  marginBottom: 8,
};

export const inlineStyle_181_54 = {
  width: '100%',
  height: '100%',
};

export const inlineStyle_190_20 = (
  {
    coverId: coverId,
    row: row,
  },
) => ({
  backgroundColor: String(coverId) === String(row.id) ? '#00695c' : '#efefef',
  paddingVertical: 6,
  borderRadius: 4,
  marginBottom: 6,
});

export const inlineStyle_197_22 = (
  {
    coverId: coverId,
    row: row,
  },
) => ({
  textAlign: 'center',
  color: String(coverId) === String(row.id) ? '#fff' : '#111',
  fontSize: 12,
});

export const inlineStyle_208_20 = {
  backgroundColor: '#b00020',
  paddingVertical: 6,
  borderRadius: 4,
};

export const inlineStyle_209_26 = {
  textAlign: 'center',
  color: '#fff',
  fontSize: 12,
};

export const attachmentLibraryStyles = {
  disabledButton: {
    opacity: 0.65,
  },
  headerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingBottom: 24,
    maxHeight: '86%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 3,
  },
  iconButton: {
    padding: 4,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 14,
  },
  searchBox: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  searchInput: {
    flex: 1,
    minWidth: 80,
    color: '#0F172A',
    fontSize: 14,
  },
  uploadButton: {
    minHeight: 42,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  modalError: {
    color: '#B91C1C',
    fontSize: 13,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loadingState: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
  },
  emptyState: {
    minHeight: 170,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 520,
  },
  libraryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 18,
  },
  fileCard: {
    width: 176,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  fileCardAttached: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  fileThumb: {
    height: 112,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileImage: {
    width: '100%',
    height: '100%',
  },
  fileInfo: {
    padding: 9,
    minHeight: 74,
  },
  fileName: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  fileMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 7,
  },
  contextBadge: {
    color: '#475569',
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '700',
  },
  attachedBadge: {
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 10,
    fontWeight: '700',
  },
  fileAction: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
