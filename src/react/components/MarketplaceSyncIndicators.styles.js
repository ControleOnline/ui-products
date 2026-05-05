import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonMuted: {
    backgroundColor: '#F8FAFC',
  },
  logo: {
    width: 16,
    height: 16,
  },
  logoMuted: {
    opacity: 0.32,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
  modalRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#64748B',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailsList: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    width: 128,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    textAlign: 'right',
  },
  blockersBox: {
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
  },
  blockersTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  blockersText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
  },
  syncButton: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncButtonDisabled: {
    opacity: 0.58,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default styles;
